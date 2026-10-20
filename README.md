# Do you need your own OAuth app?

**Live: https://composio-oauth-guides.vercel.app**

A developer building on Composio hits a question that is surprisingly hard to
answer: *do I need to register my own OAuth app with this provider, and if so,
how long until I can ship?* The answer ranges from ten minutes to six weeks plus
a paid security audit, and you usually find out which only after you are
committed.

This looks an app up and answers, in about thirty seconds:

1. Do you need your own OAuth app at all, or is Composio's managed OAuth enough?
2. How long until production, and what kind of blocker stands in the way?
3. What can you start **today** so approval waits run in parallel with building?
4. Which steps can an agent do, and where must a human take over?
5. How confident is each claim, and what is the source?

Three guides are hand-verified. Anything else is researched live by an agent.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

Only `GEMINI_API_KEY` is required — get a free one at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey), no billing
account needed. Everything else is optional:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | **Required.** Powers the agent. Server-side only; never sent to the browser. |
| `GEMINI_MODEL` | Model that reads docs and labels evidence. Default `gemini-3.5-flash`. |
| `GEMINI_DISCOVERY_MODEL` | Model that lists candidate doc URLs. Default `gemini-3.1-flash-lite`. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash Redis, so generated guides get shareable URLs. Provisioned automatically by Vercel's Upstash integration. |
| `COMPOSIO_API_KEY` | Reads managed-auth status from Composio's API instead of its public docs. |

Without Upstash, generated guides fall back to a local `.data/` file. That works
in development but **not** on Vercel, whose filesystem is read-only — generated
URLs would 404 for anyone you shared them with.

---

## Key decisions

**The blocker type and the critical path lead the guide.** Most integration docs
are ordered by the provider's process. That is the wrong order for someone
deciding whether to start. What a developer needs first is the shape of the
obstacle — *no review*, *scope review*, *business verification* — because that
determines whether this is an afternoon or a quarter. The critical path comes
next and is capped at four items, all chosen so approval waits run in parallel
with building. Steps come after; by then you have already decided.

**Composio's managed status is the first question, not a footnote.** The most
valuable answer this can give is often "you don't need to do any of this." The
verdict leads with that, so the guide can talk you out of the work.

**Evidence is per-claim, not per-page.** A guide that is 90% accurate is
dangerous if you cannot tell which 90%. Every factual statement is a claim with
an id, a status (`tested` / `sourced` / `inferred` / `unverified`), and its
sources. Claim references render as footnote markers; hovering one shows the
statement, its sources, and the date it was checked. An estimate never renders
as a confirmed fact.

**Only three seed guides, on purpose.** The slow part is not writing the JSON —
it is reading primary sources and being honest about what they do and do not
say. Three guides that are genuinely verified demonstrate the evidence model
better than twenty that are plausible. They were chosen to cover three different
blocker types: GitHub needs no review at all, Google gates on which scopes you
request, Meta gates on your legal identity.

**Nothing an agent produces may claim to be `tested`.** That status is reserved
for things a human actually did. Validation rejects it outright on generated
guides, so the distinction cannot erode as the library grows.

---

## How the agent works

Three model calls, bounded, streamed to the browser over SSE as it goes.

1. **Discovery** — given an app name, propose up to 6 likely official
   documentation URLs. This is a mechanical task, so it runs on the cheaper
   Flash-Lite model.
2. **Read** — fetch those pages with Gemini's URL-context tool and write a
   research brief with a source line per fact. Gemini reports which URLs were
   actually retrieved, which matters for the next step.
3. **Composio check** — done in code, not by the model: the Composio API when a
   key is configured, otherwise the public toolkit docs page.
4. **Synthesise** — turn the brief into the guide schema as structured JSON,
   validated with Zod. On failure the errors are fed back for one repair attempt.

### What stops it inventing things

Prompting alone is not a guarantee, so the constraints are enforced in code:

- **Citations are an allow-list.** It is built from Gemini's record of which
  pages were *actually fetched*, so a URL that 404'd cannot be cited — the model
  cannot invent a plausible-looking docs link. In the Zoom run, four of eight
  proposed URLs failed; the missing topics became open questions instead of
  invented facts.
- **`tested` is rejected** on generated guides.
- **Dangling claim references are rejected** — every `claimIds` entry must
  resolve to a claim that exists.
- **A `sourced` claim must cite a source**, and that source must be on the
  allow-list.

Anything that fails goes back for one repair pass. If it still fails, the
generation errors rather than shipping a guide that quietly breaks its own rules.

### Caps

Reviewers run this live, so each generation is bounded: 6 documentation URLs,
a 115s per-call ceiling inside a 165s overall budget, bounded output tokens, and
5 generations per IP per 10 minutes.

---

## Limits

**Free-tier quota is the binding constraint.** Gemini's free tier allows roughly
**20 requests per day** on Flash. At 2–3 Flash calls per generation that is about
**5–7 generations per day**. Seed guides and previously generated guides cost
nothing to view, which is most of why persistence matters. When quota runs out,
generation fails with a message saying when it resets; the rest of the site
keeps working.

**Free-tier Gemini is flaky under load.** Transient `503 high demand` responses
are common on the heavier document-reading call — one successful run absorbed
three of them. Calls retry with backoff, but a reviewer may still need to try
twice.

**The rate limiter is per-process.** On Vercel each serverless instance keeps its
own counter, so the real limit is looser than it looks. It stops one tab
hammering the agent; it is not a real abuse control.

**There is no self-review pass.** The brief listed one as optional. It is not
built. Hallucination is mitigated structurally — by the retrieval allow-list and
schema validation described above — rather than by asking a second model whether
the first one was honest.

**Generated guides are not hand-checked.** They are labelled as machine-extracted
with the date, and the evidence is there to audit, but only one has been verified
line-by-line against its sources.

**The model split is measured on one side only.** Running the whole pipeline on
Flash-Lite was compared against Flash on the same app, and it was clearly worse:
5 sourced claims against 9, with facts marked `unverified` that Flash cited
correctly from the same pages. That is why only the mechanical URL-discovery step
runs on Flash-Lite. The current split has **not** been compared against the
all-Flash baseline — quota ran out mid-run — so it is reasoned from that
measurement rather than verified end to end.

**Agent/human step classification is the model's judgement.** It follows an
explicit rule — anything needing login, 2FA, CAPTCHA, legal entity details,
payment or a review submission is human — but it is not verified per step.

---

## Deviations from the brief

**Gemini instead of the Anthropic API.** The brief specified Anthropic with its
server-side web search tool, and it was built that way first. It was switched
because the Anthropic API has no free tier, and a key requirement was avoiding
paid accounts.

**URL retrieval instead of web search.** The obvious Gemini equivalent, Google
Search grounding, returns a hard `429` on keys without billing — it has no free
quota at all. So the agent discovers candidate documentation URLs and fetches
them directly instead of searching. This turned out better for this use case:
Gemini reports exactly which URLs it retrieved, which is what makes the citation
allow-list possible. Searching would have given the model a pile of results to
summarise and no way to prove which page a claim came from.

---

## Verification

Full log in [`docs/verification.md`](docs/verification.md). Summary:

**Corrected during seed research.** The CASA security assessment fee was quoted
in internal research at ~$540–$3,000 from a third party; Google's own
documentation says **$500–$4,500**, so the first-party figure replaced it. A
cited Nango URL now 404s and was relocated to its current address — citing a
dead link would have been worse than not citing.

**Deliberately left unverified.** Meta publishes no review SLA. Rather than
quote an anecdotal community figure, that claim is marked `unverified` and the
verdict says "Unknown" outright.

**Agent output spot-checked.** The generated Zoom guide's claims were checked by
fetching the cited page: access tokens expire after one hour ✅, refresh tokens
after 90 days with rotation ✅, PKCE for loopback URIs ✅, deauthorization
endpoint required ✅. No hallucination found.

**All seed source URLs return 200** as of 2026-10-20.

---

## Out of scope

All 100 toolkits; user accounts or auth; actually completing any provider's
approval process; and a browser-automation agent that registers OAuth apps on
your behalf. Claims about what is "tested" cover only what a free account can
reach — no app was submitted for Google verification or Meta review.

---

## What I'd do next

**Scale the library without lowering the bar.** Batch-generate across many
toolkits, then put a human review queue in front of publication — generated
guides land as drafts and get promoted once their claims are spot-checked. The
evidence model already makes that reviewable: a reviewer reads the claims, not
the prose.

**Freshness checks.** Every claim carries a URL and a check date, so a scheduled
job could re-fetch sources, diff them, and flag guides whose evidence moved.
Provider docs reorganise constantly — one source URL already died during this
build.

**Use the Composio API for real scope data.** The managed-auth check already
uses it when a key is present; the toolkit's default scopes could come from
there too, so "do you need your own app?" compares the provider's scopes against
Composio's actual defaults rather than reasoning about them.

**A browser agent for the setup attempt.** The guides say what a human must do;
an agent driving a real registration flow would turn `inferred` time estimates
into `tested` ones, which is the one evidence status nothing currently earns.

**Make the agent/human split verifiable.** Right now it is the model's judgement.
Known provider patterns (anything behind a login, anything requiring payment)
could be checked rather than assumed.
