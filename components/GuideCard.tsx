import Link from "next/link";
import { BLOCKER_TONE } from "@/lib/display";
import type { Guide } from "@/lib/schema";

export default function GuideCard({ guide }: { guide: Guide }) {
  const tone = BLOCKER_TONE[guide.verdict.blockerType];

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-edge bg-surface p-4 shadow-[var(--shadow-sm)] transition-all hover:border-edge-strong hover:shadow-[var(--shadow-md)]"
    >
      {/* A colour spine makes blocker severity scannable down a column of cards. */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-0.5 bg-current ${tone.fg}`} />

      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-ink">{guide.appName}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.chip}`}
        >
          {tone.label}
        </span>
      </div>

      <p className="nums mt-3 text-sm leading-snug text-ink-2">
        {guide.verdict.readyIn.typical}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-ink-3">typically</p>

      <div className="mt-4 flex items-center gap-3 border-t border-edge pt-3 text-xs text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="flex gap-0.5" aria-label={`difficulty ${guide.verdict.difficulty} of 5`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`size-1 rounded-full ${
                  n <= guide.verdict.difficulty ? `bg-current ${tone.fg}` : "bg-edge-strong"
                }`}
              />
            ))}
          </span>
        </span>
        {guide.composio.managedOAuth === "yes" && <span>Composio managed</span>}
        {guide.generatedBy === "agent" && (
          <span className="ml-auto">agent · {guide.lastChecked}</span>
        )}
      </div>
    </Link>
  );
}
