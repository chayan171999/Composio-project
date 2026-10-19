import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  actorSchema,
  blockerTypeSchema,
  claimStatusSchema,
  guideSchema,
  reviewLevelSchema,
  sourceSchema,
  type Guide,
} from "@/lib/schema";
import { checkComposio, toolkitSlugCandidates } from "./composio";
import {
  RESEARCH_SYSTEM,
  SYNTHESIS_SYSTEM,
  repairPrompt,
  researchPrompt,
  synthesisPrompt,
} from "./prompts";
import type { ProgressEvent } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const MAX_SEARCHES = 6;
const MAX_RESEARCH_TURNS = 4;
const RESEARCH_MAX_TOKENS = 16000;
const SYNTHESIS_MAX_TOKENS = 24000;
const WALL_CLOCK_MS = 120_000;

// zodOutputFormat turns this into a JSON Schema, which cannot express refinements,
// so this mirrors guideSchema without them. The result is re-validated against the
// real guideSchema afterwards.
const agentGuideSchema = z.object({
  appName: z.string(),
  aliases: z.array(z.string()),
  website: z.string(),
  composio: z.object({
    managedOAuth: z.enum(["yes", "no", "unknown"]),
    whenToBringYourOwn: z.array(z.string()),
    claimIds: z.array(z.string()),
  }),
  verdict: z.object({
    oneLiner: z.string(),
    blockerType: blockerTypeSchema,
    difficulty: z.number().int().min(1).max(5),
    readyIn: z.object({ min: z.string(), typical: z.string(), worst: z.string() }),
    claimIds: z.array(z.string()),
  }),
  criticalPath: z.array(
    z.object({ action: z.string(), why: z.string(), claimIds: z.array(z.string()) }),
  ),
  beforeApproval: z.object({
    whatWorks: z.string(),
    limits: z.array(z.string()),
    claimIds: z.array(z.string()),
  }),
  steps: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      actor: actorSchema,
      whyHuman: z.string().nullable(),
      estTime: z.string().nullable(),
      claimIds: z.array(z.string()),
    }),
  ),
  config: z.object({
    portalUrl: z.string(),
    redirectUriNotes: z.string(),
    scopes: z.array(
      z.object({
        name: z.string(),
        purpose: z.string(),
        reviewLevel: reviewLevelSchema,
      }),
    ),
    otherFields: z.array(z.string()),
  }),
  review: z.object({
    requiredWhen: z.string(),
    process: z.array(z.string()),
    timeline: z.string(),
    cost: z.string(),
    recurring: z.string(),
    claimIds: z.array(z.string()),
  }),
  gotchas: z.array(z.object({ text: z.string(), claimIds: z.array(z.string()) })),
  composioHandoff: z.array(z.string()),
  claims: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      status: claimStatusSchema,
      sources: z.array(sourceSchema),
      note: z.string().nullable(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

type AgentGuide = z.infer<typeof agentGuideSchema>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function assemble(draft: AgentGuide): Guide {
  return {
    ...draft,
    slug: slugify(draft.appName),
    lastChecked: new Date().toISOString().slice(0, 10),
    generatedBy: "agent",
    verdict: {
      ...draft.verdict,
      difficulty: draft.verdict.difficulty as 1 | 2 | 3 | 4 | 5,
    },
    steps: draft.steps.map((step) => ({
      ...step,
      whyHuman: step.whyHuman ?? undefined,
      estTime: step.estTime ?? undefined,
    })),
    claims: draft.claims.map((claim) => ({
      ...claim,
      note: claim.note ?? undefined,
    })),
  };
}

function validate(guide: Guide): string[] {
  const errors: string[] = [];

  const parsed = guideSchema.safeParse(guide);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  }

  const known = new Set(guide.claims.map((claim) => claim.id));
  const referenced: [string, string[]][] = [
    ["composio.claimIds", guide.composio.claimIds],
    ["verdict.claimIds", guide.verdict.claimIds],
    ["beforeApproval.claimIds", guide.beforeApproval.claimIds],
    ["review.claimIds", guide.review.claimIds],
    ...guide.criticalPath.map(
      (item, i) => [`criticalPath[${i}].claimIds`, item.claimIds] as [string, string[]],
    ),
    ...guide.steps.map(
      (step, i) => [`steps[${i}].claimIds`, step.claimIds] as [string, string[]],
    ),
    ...guide.gotchas.map(
      (item, i) => [`gotchas[${i}].claimIds`, item.claimIds] as [string, string[]],
    ),
  ];

  for (const [path, ids] of referenced) {
    for (const id of ids) {
      if (!known.has(id)) errors.push(`${path}: "${id}" does not exist in claims`);
    }
  }

  for (const claim of guide.claims) {
    if (claim.status === "tested") {
      errors.push(
        `claims.${claim.id}: status "tested" is not allowed for generated guides — nothing here was tested by a human`,
      );
    }
  }

  return errors;
}

async function* research(
  client: Anthropic,
  query: string,
  composioDetail: Parameters<typeof researchPrompt>[1],
): AsyncGenerator<ProgressEvent, string> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: researchPrompt(query, composioDetail) },
  ];
  const startedAt = Date.now();
  let brief = "";

  for (let turn = 0; turn < MAX_RESEARCH_TURNS; turn++) {
    if (Date.now() - startedAt > WALL_CLOCK_MS) {
      yield { type: "warning", message: "Research time cap reached — synthesising from what was found." };
      break;
    }

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: RESEARCH_MAX_TOKENS,
      system: RESEARCH_SYSTEM,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
      messages,
    });

    const pendingSearches = new Map<number, string>();
    for await (const event of stream) {
      if (
        event.type === "content_block_start" &&
        event.content_block.type === "server_tool_use" &&
        event.content_block.name === "web_search"
      ) {
        pendingSearches.set(event.index, "");
      } else if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta" &&
        pendingSearches.has(event.index)
      ) {
        pendingSearches.set(
          event.index,
          (pendingSearches.get(event.index) ?? "") + event.delta.partial_json,
        );
      } else if (event.type === "content_block_stop" && pendingSearches.has(event.index)) {
        const raw = pendingSearches.get(event.index) ?? "";
        pendingSearches.delete(event.index);
        try {
          const input = JSON.parse(raw);
          if (typeof input?.query === "string") {
            yield { type: "search", query: input.query };
          }
        } catch {
          // A truncated tool input just means no progress line for this search.
        }
      }
    }

    const message = await stream.finalMessage();
    brief = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    break;
  }

  if (!brief.trim()) throw new Error("Research produced no usable notes.");
  return brief;
}

export async function* generateGuide(query: string): AsyncGenerator<ProgressEvent> {
  const client = new Anthropic();

  yield { type: "stage", message: `Resolving "${query}"…` };
  yield { type: "stage", message: "Checking Composio managed auth…" };
  const composio = await checkComposio(toolkitSlugCandidates(query));

  yield { type: "stage", message: "Researching official documentation…" };
  const brief = yield* research(client, query, composio);

  yield { type: "stage", message: "Synthesising the guide…" };
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: SYNTHESIS_MAX_TOKENS,
    system: SYNTHESIS_SYSTEM,
    output_config: { effort: "medium", format: zodOutputFormat(agentGuideSchema) },
    messages: [{ role: "user", content: synthesisPrompt(query, composio, brief) }],
  });

  let draft = response.parsed_output;
  if (!draft) throw new Error("The model did not return a parseable guide.");

  yield { type: "stage", message: "Validating claims…" };
  let guide = assemble(draft);
  let errors = validate(guide);

  if (errors.length > 0) {
    yield { type: "warning", message: `Validation found ${errors.length} problem(s) — repairing.` };
    const repair = await client.messages.parse({
      model: MODEL,
      max_tokens: SYNTHESIS_MAX_TOKENS,
      system: SYNTHESIS_SYSTEM,
      output_config: { effort: "medium", format: zodOutputFormat(agentGuideSchema) },
      messages: [
        { role: "user", content: synthesisPrompt(query, composio, brief) },
        { role: "assistant", content: JSON.stringify(draft) },
        { role: "user", content: repairPrompt(errors.join("\n")) },
      ],
    });
    if (repair.parsed_output) {
      draft = repair.parsed_output;
      guide = assemble(draft);
      errors = validate(guide);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Generated guide failed validation:\n${errors.slice(0, 8).join("\n")}`);
  }

  yield { type: "done", guide };
}
