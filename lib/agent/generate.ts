import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  actorSchema,
  blockerTypeSchema,
  claimStatusSchema,
  guideSchema,
  reviewLevelSchema,
  sourceSchema,
  type Guide,
  type Source,
} from "@/lib/schema";
import { checkComposio, toolkitSlugCandidates } from "./composio";
import {
  DISCOVERY_SYSTEM,
  RESEARCH_SYSTEM,
  SYNTHESIS_SYSTEM,
  discoveryPrompt,
  repairPrompt,
  researchPrompt,
  synthesisPrompt,
} from "./prompts";
import type { ProgressEvent } from "./types";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const DISCOVERY_MAX_TOKENS = 4000;
const RESEARCH_MAX_TOKENS = 16000;
const SYNTHESIS_MAX_TOKENS = 32000;
const MAX_URLS = 6;
const RETRY_ATTEMPTS = 4;
const RETRY_BASE_MS = 2000;
// Kept under the route's maxDuration so a stuck generation surfaces as a real error
// rather than an opaque platform timeout. The per-call ceiling has to clear the
// documentation-reading call, which fetches every candidate page and runs far slower
// deployed than it does locally.
const WALL_CLOCK_MS = 165_000;
const PER_CALL_TIMEOUT_MS = 115_000;

// Mirrors guideSchema minus the fields set in code, and without refinements —
// JSON Schema cannot express those. The result is re-validated against the real
// guideSchema afterwards.
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
      whyHuman: z.string().optional(),
      estTime: z.string().optional(),
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
      note: z.string().optional(),
    }),
  ),
  openQuestions: z.array(z.string()),
});

type AgentGuide = z.infer<typeof agentGuideSchema>;

// Gemini's responseJsonSchema rejects $schema and additionalProperties.
function stripUnsupportedKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedKeywords);
  if (node && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>)
        .filter(([key]) => key !== "$schema" && key !== "additionalProperties")
        .map(([key, value]) => [key, stripUnsupportedKeywords(value)]),
    );
  }
  return node;
}

const responseJsonSchema = stripUnsupportedKeywords(z.toJSONSchema(agentGuideSchema));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const discoverySchema = z.object({
  urls: z.array(z.object({ url: z.string(), topic: z.string() })),
});

const discoveryJsonSchema = stripUnsupportedKeywords(z.toJSONSchema(discoverySchema));

// The free tier returns 503 UNAVAILABLE ("high demand") and 429 often enough that a
// single attempt frequently fails. Both are transient here, unlike the hard 429 that
// googleSearch grounding returns for having no free quota at all.
async function withRetry<T>(
  label: string,
  call: (signal: AbortSignal) => Promise<T>,
  onRetry: (message: string) => void,
  deadline: AbortSignal,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    if (deadline.aborted) {
      throw new Error(`${label} ran out of time (${WALL_CLOCK_MS / 1000}s budget).`);
    }
    try {
      return await call(
        AbortSignal.any([deadline, AbortSignal.timeout(PER_CALL_TIMEOUT_MS)]),
      );
    } catch (error) {
      lastError = error;
      if (deadline.aborted) {
        throw new Error(`${label} ran out of time (${WALL_CLOCK_MS / 1000}s budget).`);
      }
      const message = String(error instanceof Error ? error.message : error);

      // A daily-quota 429 names the free-tier metric and asks for a wait measured in
      // minutes, so retrying only burns the time budget. Surface it instead.
      if (/free_tier_requests|PerDay/.test(message)) {
        const minutes = message.match(/retry in (\d+)m/)?.[1];
        throw new Error(
          `Daily free-tier quota exhausted for ${MODEL}.${minutes ? ` Resets in about ${minutes} minutes.` : ""} Seed guides still work; generation needs a fresh quota window or a billed key.`,
        );
      }

      const retryable = /"code":\s*(503|429)/.test(message);
      if (!retryable || attempt === RETRY_ATTEMPTS) break;

      const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
      onRetry(`${label} hit a transient error — retrying in ${delay / 1000}s…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

function titleFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop();
    return last ? `${hostname} — ${last.replace(/[-_]/g, " ")}` : hostname;
  } catch {
    return url;
  }
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
  };
}

function validate(guide: Guide, allowedUrls: Set<string>): string[] {
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
    for (const source of claim.sources) {
      if (!allowedUrls.has(source.url)) {
        errors.push(
          `claims.${claim.id}: source "${source.url}" was not among the pages actually retrieved — cite only the listed sources`,
        );
      }
    }
  }

  return errors;
}

async function parseJson(text: string): Promise<unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  return JSON.parse(trimmed);
}

export async function* generateGuide(query: string): AsyncGenerator<ProgressEvent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const ai = new GoogleGenAI({ apiKey });
  const deadline = AbortSignal.timeout(WALL_CLOCK_MS);

  yield { type: "stage", message: `Resolving "${query}"…` };
  yield { type: "stage", message: "Checking Composio managed auth…" };
  const composio = await checkComposio(toolkitSlugCandidates(query));

  // withRetry cannot yield, so retry notices are buffered and drained after each call.
  const notices: string[] = [];
  const note = (message: string) => void notices.push(message);
  const drain = (): ProgressEvent[] =>
    notices.splice(0).map((message) => ({ type: "warning", message }));

  yield { type: "stage", message: "Finding official documentation…" };
  const discovery = await withRetry(
    "Discovery",
    (signal) =>
      ai.models.generateContent({
        model: MODEL,
        contents: discoveryPrompt(query),
        config: {
          systemInstruction: DISCOVERY_SYSTEM,
          maxOutputTokens: DISCOVERY_MAX_TOKENS,
          responseMimeType: "application/json",
          responseJsonSchema: discoveryJsonSchema,
          abortSignal: signal,
        },
      }),
    note,
    deadline,
  );
  yield* drain();

  const candidates = discoverySchema
    .parse(await parseJson(discovery.text ?? ""))
    .urls.map((entry) => entry.url)
    .filter((url) => /^https?:\/\//.test(url))
    .slice(0, MAX_URLS);

  if (candidates.length === 0) throw new Error("No candidate documentation URLs found.");
  for (const url of candidates) yield { type: "fetch", url };

  yield { type: "stage", message: "Reading documentation…" };
  const research = await withRetry(
    "Reading documentation",
    (signal) =>
      ai.models.generateContent({
        model: MODEL,
        contents: researchPrompt(query, composio, candidates),
        config: {
          systemInstruction: RESEARCH_SYSTEM,
          maxOutputTokens: RESEARCH_MAX_TOKENS,
          tools: [{ urlContext: {} }],
          abortSignal: signal,
        },
      }),
    note,
    deadline,
  );
  yield* drain();

  const brief = research.text ?? "";
  if (!brief.trim()) throw new Error("Research produced no usable notes.");

  // urlContextMetadata is the authoritative record of what was actually fetched, so
  // the citation allow-list is built from retrieval successes rather than from the
  // URLs we asked for.
  const sources: Source[] = [];
  for (const entry of research.candidates?.[0]?.urlContextMetadata?.urlMetadata ?? []) {
    const url = entry.retrievedUrl;
    const ok = entry.urlRetrievalStatus === "URL_RETRIEVAL_STATUS_SUCCESS";
    if (!url) continue;
    yield { type: "fetch", url, ok };
    if (ok && !sources.some((source) => source.url === url)) {
      sources.push({ url, title: titleFromUrl(url) });
    }
  }

  if (sources.length === 0) {
    yield {
      type: "warning",
      message: "No pages could be retrieved — every claim will be inferred or unverified.",
    };
  }
  const allowedUrls = new Set(sources.map((source) => source.url));

  yield { type: "stage", message: "Synthesising the guide…" };
  const synthesisConfig = {
    systemInstruction: SYNTHESIS_SYSTEM,
    maxOutputTokens: SYNTHESIS_MAX_TOKENS,
    responseMimeType: "application/json",
    responseJsonSchema,
  };

  const response = await withRetry(
    "Synthesis",
    (signal) =>
      ai.models.generateContent({
        model: MODEL,
        contents: synthesisPrompt(query, composio, brief, sources),
        config: { ...synthesisConfig, abortSignal: signal },
      }),
    note,
    deadline,
  );
  yield* drain();

  let draft = agentGuideSchema.parse(await parseJson(response.text ?? ""));

  yield { type: "stage", message: "Validating claims…" };
  let guide = assemble(draft);
  let errors = validate(guide, allowedUrls);

  if (errors.length > 0) {
    yield {
      type: "warning",
      message: `Validation found ${errors.length} problem(s) — repairing.`,
    };
    const repair = await withRetry(
      "Repair",
      (signal) =>
        ai.models.generateContent({
          model: MODEL,
          contents: [
            { role: "user", parts: [{ text: synthesisPrompt(query, composio, brief, sources) }] },
            { role: "model", parts: [{ text: JSON.stringify(draft) }] },
            { role: "user", parts: [{ text: repairPrompt(errors.join("\n")) }] },
          ],
          config: { ...synthesisConfig, abortSignal: signal },
        }),
      note,
      deadline,
    );
    yield* drain();

    const repaired = agentGuideSchema.safeParse(await parseJson(repair.text ?? ""));
    if (repaired.success) {
      draft = repaired.data;
      guide = assemble(draft);
      errors = validate(guide, allowedUrls);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Generated guide failed validation:\n${errors.slice(0, 8).join("\n")}`);
  }

  yield { type: "done", guide };
}
