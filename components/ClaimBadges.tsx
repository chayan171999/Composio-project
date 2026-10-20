import { CLAIM_TONE } from "@/lib/display";
import type { Claim } from "@/lib/schema";

/**
 * Claim references render as footnote markers rather than repeated status words.
 * Three "Sourced" chips in a row carried no more meaning than "¹ ² ³" and broke
 * the reading line; status now shows as colour, with detail on hover or focus.
 *
 * Everything here is phrasing content — a <details> or <div> would be invalid
 * inside the <p> elements these markers sit in, which fails hydration.
 */
export default function ClaimBadges({
  claimIds,
  claims,
}: {
  claimIds: string[];
  claims: Claim[];
}) {
  const matched = claimIds
    .map((id) => claims.find((claim) => claim.id === id))
    .filter((claim): claim is Claim => claim !== undefined);

  if (matched.length === 0) return null;

  return (
    <span className="ml-1 inline-flex gap-0.5 align-super">
      {matched.map((claim) => {
        const tone = CLAIM_TONE[claim.status];
        return (
          <span key={claim.id} className="group relative inline-block">
            <button
              type="button"
              aria-label={`${tone.label}: ${claim.text}`}
              className={`nums cursor-help rounded px-1 text-[10px] font-semibold leading-4 ${tone.chip}`}
            >
              {claim.id.replace(/^c/, "")}
            </button>
            <span className="pointer-events-none invisible absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-edge bg-surface p-3 text-left opacity-0 shadow-[var(--shadow-md)] transition-opacity group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.chip}`}
              >
                {tone.label}
              </span>
              <span className="mt-2 block text-xs font-normal leading-relaxed text-ink">
                {claim.text}
              </span>
              {claim.note && (
                <span className="mt-2 block text-xs font-normal leading-relaxed text-ink-3">
                  {claim.note}
                </span>
              )}
              <span className="mt-2 block border-t border-edge pt-2">
                {claim.sources.length > 0 ? (
                  claim.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs font-normal text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                    >
                      {source.title}
                    </a>
                  ))
                ) : (
                  <span className="block text-xs font-normal text-ink-3">
                    No source — see the note above.
                  </span>
                )}
              </span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
