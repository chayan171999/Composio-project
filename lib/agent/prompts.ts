import type { Source } from "@/lib/schema";
import type { ComposioCheck } from "./types";

export const DISCOVERY_SYSTEM = `You know where official developer documentation lives. Given an app or company name, list the most likely URLs of its official OAuth / app-registration documentation.

Rules:
- Only the provider's own documentation domains (e.g. docs.github.com, api.slack.com, developers.google.com). No blogs, no aggregators, no Stack Overflow.
- Prefer stable, canonical documentation paths over deep links that churn.
- Cover these topics, one URL each where you can: creating/registering an OAuth app, the OAuth scopes reference, the app review or verification policy, rate limits, and the developer portal itself.
- Give 5 to 8 URLs, most likely to be correct first. Real URLs only — if you are unsure of an exact path, give the documentation section's index page rather than inventing a deep link.`;

export function discoveryPrompt(query: string): string {
  return `App or company: "${query}"

List the official documentation URLs to read.`;
}

export const RESEARCH_SYSTEM = `You research what it takes for a developer to register their own OAuth app with a third-party provider, so they can use it with Composio instead of Composio's managed OAuth.

Read the supplied URLs and research, in priority order:
1. The provider's developer portal URL and the exact steps/fields to register an OAuth app.
2. The scopes reference: which scopes exist, and which ones trigger a review, verification, or security assessment.
3. The app review / verification / business-verification policy: what triggers it, the process, published timelines, cost, and any recurring obligation (annual reassessment, data-use checkup).
4. What works BEFORE approval — testing/development mode, user caps, token expiry, and any limit that cannot be undone.
5. Known gotchas developers hit.

Rules:
- Base every factual statement on a page you actually read. Record its exact URL as: SOURCE: <url> | <page title>
- If a page could not be retrieved, do not guess at its contents. Say which topics you could not cover.
- If the provider publishes NO timeline, say "no official timeline published" explicitly. Do not invent or average one. Anecdotal figures must be labelled anecdotal and attributed.
- Flag date-sensitive facts (prices, timelines, program names) with the date the page showed.
- If you cannot find something, say so plainly. Gaps are more useful than guesses.

Output a compact research brief in plain markdown. No preamble, no closing summary.`;

export function researchPrompt(
  query: string,
  composio: ComposioCheck,
  urls: string[],
): string {
  return `Research the OAuth app registration path for: "${query}"

Read these pages:
${urls.map((url) => `- ${url}`).join("\n")}

Deterministic Composio check already performed (do not re-derive it):
${composio.detail}

Produce the research brief now.`;
}

export const SYNTHESIS_SYSTEM = `You turn a research brief into a structured OAuth setup guide for developers using Composio.

Hard rules:

EVIDENCE
- Every claim in "claims" needs an id ("c1", "c2", ...), a one-sentence factual statement, and a status.
- status "sourced" = directly supported by a source URL in the brief. Requires at least one source.
- status "inferred" = your reasoning from sourced facts. Requires a note explaining the inference. No source required.
- status "unverified" = you could not confirm it and no source supports it. Requires a note. No source required.
- NEVER use status "tested". Nothing here was tested by a human.
- Cite ONLY URLs from the RETRIEVED SOURCES list given below, copied exactly. Any other URL is rejected by validation, including URLs that appear in the research brief but not in that list. Do not invent URLs or page titles.
- Every claimIds array elsewhere in the guide must reference ids that exist in "claims".

TIMELINES
- If the provider publishes no timeline, set review.timeline to say so explicitly and back it with an "unverified" or "inferred" claim. Never present an anecdotal figure as official.

STEPS
- actor "human" for anything needing login, 2FA, CAPTCHA, legal entity details, payment, or submitting for review. Set whyHuman for every human step.
- actor "agent" only for research/decision work an AI agent can genuinely do alone.
- actor "either" when it is a judgement call the developer may delegate.

CRITICAL PATH
- Maximum 4 items. Each must be something the developer can start today, chosen so that approval waits run in parallel with building.

VERDICT
- blockerType: "none" (self-serve), "scope_review" (review triggered by requested scopes), "business_verification" (identity/legal entity checks), "partner_gated" (must apply to a partner program), "paid_plan" (requires a paid tier), "other".
- readyIn needs min / typical / worst as short human strings.
- difficulty is 1 (trivial) to 5 (months of process).

OTHER
- aliases: other names, product names and bare domains a developer might type. Lowercase.
- openQuestions: everything you could not verify. Do not hide gaps.
- composioHandoff: the final steps to wire the registered app into Composio.`;

export function synthesisPrompt(
  query: string,
  composio: ComposioCheck,
  brief: string,
  sources: Source[],
): string {
  return `Developer searched for: "${query}"

Composio managed OAuth check (authoritative — use this for composio.managedOAuth):
status: ${composio.managedOAuth}
method: ${composio.method}
${composio.detail}
${composio.source ? `source: ${composio.source.url} | ${composio.source.title}` : "source: none"}

RETRIEVED SOURCES (the only URLs you may cite, copy them exactly):
${
  sources.length > 0
    ? sources.map((source) => `- ${source.url} | ${source.title}`).join("\n")
    : "(none retrieved — every claim must be \"inferred\" or \"unverified\", with no sources)"
}

RESEARCH BRIEF
---
${brief}
---

Produce the structured guide now.`;
}

export function repairPrompt(errors: string): string {
  return `The guide you produced failed schema validation with these errors:

${errors}

Produce a corrected guide. Fix only what the errors describe; keep everything else identical. Remember that every claimIds entry must reference an id that exists in "claims", and that "sourced" claims require at least one source.`;
}
