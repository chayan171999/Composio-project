import ClaimBadges from "@/components/ClaimBadges";
import { ACTOR_LABEL, BLOCKER_TONE, REVIEW_LEVEL_TONE } from "@/lib/display";
import type { Guide } from "@/lib/schema";

export default function GuideView({ guide }: { guide: Guide }) {
  const { claims } = guide;
  const tone = BLOCKER_TONE[guide.verdict.blockerType];

  return (
    <article>
      <Verdict guide={guide} />

      <Section
        title="When to bring your own"
        hint="Reasons Composio's managed OAuth may not be enough"
      >
        <ul className="space-y-2">
          {guide.composio.whenToBringYourOwn.map((reason) => (
            <li key={reason} className="flex gap-2.5 text-sm text-ink-2">
              <span aria-hidden className={`mt-2 size-1 shrink-0 rounded-full bg-current ${tone.fg}`} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        <Refs claimIds={guide.composio.claimIds} claims={claims} checkedOn={guide.lastChecked} />
      </Section>

      <Section title="Start today" hint="Run these in parallel with any approval wait">
        <ol className="space-y-4">
          {guide.criticalPath.map((item, i) => (
            <li key={item.action} className="flex gap-3.5">
              <span className="nums mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-semibold text-ink-2">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {item.action}
                  <ClaimBadges claimIds={item.claimIds} claims={claims} checkedOn={guide.lastChecked} />
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="While you wait">
        <p className="text-sm leading-relaxed text-ink-2">
          {guide.beforeApproval.whatWorks}
        </p>
        <ul className="mt-3 space-y-2 rounded-lg border border-edge bg-sunken p-4">
          {guide.beforeApproval.limits.map((limit) => (
            <li key={limit} className="flex gap-2.5 text-sm text-ink-2">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
              <span>{limit}</span>
            </li>
          ))}
        </ul>
        <Refs claimIds={guide.beforeApproval.claimIds} claims={claims} checkedOn={guide.lastChecked} />
      </Section>

      <Section title="Steps">
        <ol className="space-y-5">
          {guide.steps.map((step, i) => (
            <li key={step.title} className="relative pl-6">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 size-2 rounded-full border-2 border-edge-strong bg-surface"
              />
              {i < guide.steps.length - 1 && (
                <span aria-hidden className="absolute left-[3px] top-5 h-full w-px bg-edge" />
              )}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-ink">
                  {step.title}
                  <ClaimBadges claimIds={step.claimIds} claims={claims} checkedOn={guide.lastChecked} />
                </p>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    step.actor === "human"
                      ? "bg-accent-soft text-accent"
                      : "bg-sunken text-ink-3"
                  }`}
                >
                  {ACTOR_LABEL[step.actor] ?? step.actor}
                </span>
                {step.estTime && (
                  <span className="nums text-xs text-ink-3">{step.estTime}</span>
                )}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.detail}</p>
              {step.whyHuman && (
                <p className="mt-1 text-xs text-ink-3">Needs you: {step.whyHuman}</p>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Config">
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-ink-3">Portal</dt>
            <dd className="min-w-0">
              <a
                href={guide.config.portalUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all font-mono text-xs text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              >
                {guide.config.portalUrl}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Redirect URI</dt>
            <dd className="mt-1 leading-relaxed text-ink-2">
              {guide.config.redirectUriNotes}
            </dd>
          </div>
        </dl>

        {guide.config.scopes.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-edge">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-sunken">
                  <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-3">
                    Scope
                  </th>
                  <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-3">
                    Purpose
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-ink-3">
                    Review
                  </th>
                </tr>
              </thead>
              <tbody>
                {guide.config.scopes.map((scope) => {
                  const level =
                    REVIEW_LEVEL_TONE[scope.reviewLevel] ?? REVIEW_LEVEL_TONE.unknown;
                  return (
                    <tr key={scope.name} className="border-t border-edge align-top">
                      <td className="px-3 py-2.5">
                        <code className="break-all font-mono text-xs text-ink">
                          {scope.name}
                        </code>
                      </td>
                      <td className="px-3 py-2.5 text-ink-2">{scope.purpose}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${level.chip}`}
                        >
                          {level.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {guide.config.otherFields.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            Other fields: {guide.config.otherFields.join(" · ")}
          </p>
        )}
      </Section>

      <Section title="Review &amp; approval">
        {/* A bare "Required when " prefix read as "Required when Never, for
            standard OAuth Apps" on guides whose answer is "never". */}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
          When it applies
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          {guide.review.requiredWhen}
        </p>
        <ol className="mt-3 space-y-2">
          {guide.review.process.map((step, i) => (
            <li key={step} className="flex gap-2.5 text-sm text-ink-2">
              <span className="nums shrink-0 text-ink-3">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge sm:grid-cols-3">
          <Fact label="Timeline" value={guide.review.timeline} />
          <Fact label="Cost" value={guide.review.cost} />
          <Fact label="Recurring" value={guide.review.recurring} />
        </div>
        <Refs claimIds={guide.review.claimIds} claims={claims} checkedOn={guide.lastChecked} />
      </Section>

      <Section title="Gotchas">
        <ul className="space-y-3">
          {guide.gotchas.map((gotcha) => (
            <li
              key={gotcha.text}
              className="flex gap-2.5 border-l-2 border-warn/40 pl-3 text-sm leading-relaxed text-ink-2"
            >
              <span>
                {gotcha.text}
                <ClaimBadges claimIds={gotcha.claimIds} claims={claims} checkedOn={guide.lastChecked} />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hand off to Composio">
        <ol className="space-y-2.5">
          {guide.composioHandoff.map((step, i) => (
            <li key={step} className="flex gap-3 text-sm text-ink-2">
              <span className="nums shrink-0 text-ink-3">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Evidence" hint={`${claims.length} claims behind this guide`}>
        <ul className="divide-y divide-edge rounded-lg border border-edge">
          {claims.map((claim) => (
            <li key={claim.id} className="flex gap-3 p-3">
              <ClaimBadges claimIds={[claim.id]} claims={claims} checkedOn={guide.lastChecked} />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-ink-2">{claim.text}</p>
                {claim.sources.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {claim.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-xs text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                      >
                        {source.title}
                      </a>
                    ))}
                  </p>
                )}
                {claim.note && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-3">{claim.note}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        {guide.openQuestions.length > 0 && (
          <div className="mt-4 rounded-lg border border-edge bg-sunken p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              Open questions
            </p>
            <ul className="mt-2 space-y-2">
              {guide.openQuestions.map((q) => (
                <li key={q} className="flex gap-2.5 text-sm text-ink-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-ink-3">
          Last checked {guide.lastChecked} ·{" "}
          {guide.generatedBy === "seed"
            ? "Hand-verified seed guide"
            : "Generated by agent — claims are machine-extracted, verify before relying on them"}
        </p>
      </Section>
    </article>
  );
}

const STAGES = (min: string, typical: string, worst: string, midTone: string) => [
  { k: "min", v: min, c: "text-ok" },
  { k: "typical", v: typical, c: midTone },
  { k: "worst", v: worst, c: "text-risk" },
];

function ownAppAnswer(managed: Guide["composio"]["managedOAuth"]) {
  if (managed === "no") {
    return {
      answer: "Yes",
      detail: "Composio has no managed OAuth for this toolkit, so your own app is the only route.",
      tone: "text-warn",
    };
  }
  if (managed === "unknown") {
    return {
      answer: "Unclear",
      detail: "Composio's managed status could not be confirmed — check the evidence below.",
      tone: "text-ink-2",
    };
  }
  return {
    answer: "Only if you need to",
    detail: "Composio manages OAuth for this toolkit; bring your own for the reasons below.",
    tone: "text-ok",
  };
}

function Verdict({ guide }: { guide: Guide }) {
  const tone = BLOCKER_TONE[guide.verdict.blockerType];
  const own = ownAppAnswer(guide.composio.managedOAuth);
  const { min, typical, worst } = guide.verdict.readyIn;

  return (
    <header className="rounded-xl border border-edge bg-surface p-6 shadow-[var(--shadow-sm)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-3">{guide.appName}</p>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone.chip}`}
        >
          {tone.label}
        </span>
      </div>

      <h1 className="mt-3 text-balance text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
        {guide.verdict.oneLiner}
        <ClaimBadges claimIds={guide.verdict.claimIds} claims={guide.claims} checkedOn={guide.lastChecked} />
      </h1>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
          Ready in
        </p>
        {/* Narrow screens stack: three columns turn these strings into unreadable
            slivers when a value is a sentence rather than "10 minutes". */}
        <dl className="mt-3 space-y-2.5 sm:hidden">
          {STAGES(min, typical, worst, tone.fg).map((col) => (
            <div key={col.k} className="flex items-baseline gap-2.5">
              <span aria-hidden className={`size-[7px] shrink-0 rounded-full bg-current ${col.c}`} />
              <dt className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                {col.k}
              </dt>
              <dd className={`nums text-sm font-medium leading-snug ${col.c}`}>{col.v}</dd>
            </div>
          ))}
        </dl>

        <div className="relative mt-3 hidden sm:block">
          <span
            aria-hidden
            className="absolute left-1 right-1 top-[3px] h-px bg-edge-strong"
          />
          <div className="relative grid grid-cols-3 gap-3">
            {STAGES(min, typical, worst, tone.fg).map((col, i) => (
              <div
                key={col.k}
                className={`flex flex-col ${
                  i === 0
                    ? "items-start text-left"
                    : i === 1
                      ? "items-center text-center"
                      : "items-end text-right"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-[7px] rounded-full bg-current ${col.c}`}
                />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                  {col.k}
                </p>
                <p className={`nums mt-0.5 text-sm font-medium leading-snug ${col.c}`}>
                  {col.v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The spec's first question is "do I even need my own OAuth app?" — the raw
          managed-OAuth flag stated a fact without answering it. */}
      <div className="mt-6 border-t border-edge pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
          Do you need your own OAuth app?
        </p>
        <p className="mt-1 text-sm">
          <span className={`font-semibold ${own.tone}`}>{own.answer}</span>
          <span className="text-ink-2"> — {own.detail}</span>
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="text-ink-3">Difficulty</span>
          <span className="flex gap-1" aria-label={`${guide.verdict.difficulty} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`size-1.5 rounded-full ${
                  n <= guide.verdict.difficulty ? `bg-current ${tone.fg}` : "bg-edge-strong"
                }`}
              />
            ))}
          </span>
          <span className="text-ink-3">
            {guide.verdict.difficulty}/5 to set up
          </span>
        </div>
      </div>
    </header>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-edge pb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">{title}</h2>
        {hint && <p className="text-xs text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{value}</p>
    </div>
  );
}

function Refs({
  claimIds,
  claims,
  checkedOn,
}: {
  claimIds: string[];
  claims: Guide["claims"];
  checkedOn?: string;
}) {
  if (claimIds.length === 0) return null;
  return (
    <p className="mt-3 text-xs text-ink-3">
      Evidence
      <ClaimBadges claimIds={claimIds} claims={claims} checkedOn={checkedOn} />
    </p>
  );
}
