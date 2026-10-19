import type { Claim, ClaimStatus } from "@/lib/schema";

const STATUS_STYLES: Record<ClaimStatus, string> = {
  tested: "bg-emerald-100 text-emerald-800 border-emerald-300",
  sourced: "bg-sky-100 text-sky-800 border-sky-300",
  inferred: "bg-amber-100 text-amber-800 border-amber-300",
  unverified: "bg-rose-100 text-rose-800 border-rose-300",
};

const STATUS_LABELS: Record<ClaimStatus, string> = {
  tested: "Tested",
  sourced: "Sourced",
  inferred: "Inferred",
  unverified: "Unverified",
};

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
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {matched.map((claim) => (
        <details key={claim.id} className="group relative inline-block">
          <summary
            className={`cursor-pointer list-none rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[claim.status]}`}
          >
            {STATUS_LABELS[claim.status]}
          </summary>
          <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg">
            <p className="mb-2">{claim.text}</p>
            {claim.note && (
              <p className="mb-2 italic text-gray-500">{claim.note}</p>
            )}
            {claim.sources.length > 0 ? (
              <ul className="space-y-1">
                {claim.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 underline hover:text-sky-800"
                    >
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No source cited.</p>
            )}
          </div>
        </details>
      ))}
    </span>
  );
}
