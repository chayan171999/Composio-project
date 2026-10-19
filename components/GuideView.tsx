import ClaimBadges from "@/components/ClaimBadges";
import type { Guide } from "@/lib/schema";

const BLOCKER_LABELS: Record<string, string> = {
  none: "No review",
  scope_review: "Scope review",
  business_verification: "Business verification",
  partner_gated: "Partner-gated",
  paid_plan: "Paid plan required",
  other: "Other",
};

export default function GuideView({ guide }: { guide: Guide }) {
  const { claims } = guide;

  return (
    <article className="text-gray-900">
      <header className="mb-8 border-b border-gray-200 pb-6">
        <p className="text-sm font-medium text-gray-500">{guide.appName}</p>
        <h1 className="mt-1 text-2xl font-semibold">{guide.verdict.oneLiner}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5">
            {BLOCKER_LABELS[guide.verdict.blockerType] ?? guide.verdict.blockerType}
          </span>
          <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5">
            Difficulty {guide.verdict.difficulty}/5
          </span>
          <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5">
            Composio managed OAuth: {guide.composio.managedOAuth}
          </span>
          <ClaimBadges claimIds={guide.verdict.claimIds} claims={claims} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Min</dt>
            <dd className="font-medium">{guide.verdict.readyIn.min}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Typical</dt>
            <dd className="font-medium">{guide.verdict.readyIn.typical}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Worst case</dt>
            <dd className="font-medium">{guide.verdict.readyIn.worst}</dd>
          </div>
        </dl>
      </header>

      <Section title="Do you need your own OAuth app?">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {guide.composio.whenToBringYourOwn.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="mt-2">
          <ClaimBadges claimIds={guide.composio.claimIds} claims={claims} />
        </div>
      </Section>

      <Section title="Start today — critical path">
        <ol className="space-y-3 text-sm">
          {guide.criticalPath.map((item, i) => (
            <li key={item.action} className="flex gap-3">
              <span className="font-semibold text-gray-400">{i + 1}.</span>
              <div>
                <p className="font-medium">{item.action}</p>
                <p className="text-gray-600">{item.why}</p>
                <ClaimBadges claimIds={item.claimIds} claims={claims} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="While you wait">
        <p className="text-sm">{guide.beforeApproval.whatWorks}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {guide.beforeApproval.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        <div className="mt-2">
          <ClaimBadges claimIds={guide.beforeApproval.claimIds} claims={claims} />
        </div>
      </Section>

      <Section title="Steps">
        <ol className="space-y-4 text-sm">
          {guide.steps.map((step, i) => (
            <li key={step.title} className="border-l-2 border-gray-200 pl-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-400">{i + 1}.</span>
                <p className="font-medium">{step.title}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {step.actor === "agent"
                    ? "🤖 Agent"
                    : step.actor === "human"
                      ? "👤 Human"
                      : "🤖/👤 Either"}
                </span>
                {step.estTime && (
                  <span className="text-xs text-gray-400">{step.estTime}</span>
                )}
              </div>
              <p className="mt-1 text-gray-600">{step.detail}</p>
              {step.whyHuman && (
                <p className="mt-1 text-xs italic text-gray-500">
                  Why human: {step.whyHuman}
                </p>
              )}
              <ClaimBadges claimIds={step.claimIds} claims={claims} />
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Config">
        <p className="text-sm">
          Developer portal:{" "}
          <a
            href={guide.config.portalUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 underline"
          >
            {guide.config.portalUrl}
          </a>
        </p>
        <p className="mt-2 text-sm text-gray-600">{guide.config.redirectUriNotes}</p>
        {guide.config.scopes.length > 0 && (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-1 pr-2">Scope</th>
                <th className="py-1 pr-2">Purpose</th>
                <th className="py-1">Review level</th>
              </tr>
            </thead>
            <tbody>
              {guide.config.scopes.map((scope) => (
                <tr key={scope.name} className="border-b border-gray-100">
                  <td className="py-1 pr-2 font-mono text-xs">{scope.name}</td>
                  <td className="py-1 pr-2 text-gray-600">{scope.purpose}</td>
                  <td className="py-1 text-gray-600">{scope.reviewLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {guide.config.otherFields.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Other fields: {guide.config.otherFields.join(", ")}
          </p>
        )}
      </Section>

      <Section title="Review & approval">
        <p className="text-sm">
          <span className="font-medium">Required when: </span>
          {guide.review.requiredWhen}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {guide.review.process.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
        <dl className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Timeline</dt>
            <dd>{guide.review.timeline}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Cost</dt>
            <dd>{guide.review.cost}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Recurring</dt>
            <dd>{guide.review.recurring}</dd>
          </div>
        </dl>
        <div className="mt-2">
          <ClaimBadges claimIds={guide.review.claimIds} claims={claims} />
        </div>
      </Section>

      <Section title="Gotchas">
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {guide.gotchas.map((gotcha) => (
            <li key={gotcha.text}>
              {gotcha.text} <ClaimBadges claimIds={gotcha.claimIds} claims={claims} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hand off to Composio">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {guide.composioHandoff.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>

      <Section title="Evidence">
        <ul className="space-y-3 text-sm">
          {claims.map((claim) => (
            <li key={claim.id} className="flex items-start gap-2">
              <ClaimBadges claimIds={[claim.id]} claims={claims} />
              <span>{claim.text}</span>
            </li>
          ))}
        </ul>
        {guide.openQuestions.length > 0 && (
          <div className="mt-4">
            <p className="font-medium">Open questions</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              {guide.openQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Last checked {guide.lastChecked} ·{" "}
          {guide.generatedBy === "seed"
            ? "Hand-verified seed guide"
            : "Generated by agent — claims are machine-extracted, verify before relying on them"}
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
