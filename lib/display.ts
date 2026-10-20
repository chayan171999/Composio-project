import type { BlockerType } from "./schema";

type Chip = { label: string; className: string };

export const BLOCKER_CHIP: Record<BlockerType, Chip> = {
  none: { label: "No review", className: "bg-emerald-100 text-emerald-800" },
  scope_review: { label: "Scope review", className: "bg-amber-100 text-amber-800" },
  business_verification: {
    label: "Business verification",
    className: "bg-rose-100 text-rose-800",
  },
  partner_gated: { label: "Partner-gated", className: "bg-rose-100 text-rose-800" },
  paid_plan: { label: "Paid plan", className: "bg-violet-100 text-violet-800" },
  other: { label: "Other", className: "bg-gray-100 text-gray-700" },
};

// Review level is the single biggest driver of how long a guide's timeline runs,
// so it is colour-coded the same way as the blocker type.
export const REVIEW_LEVEL_CHIP: Record<string, Chip> = {
  none: { label: "none", className: "bg-emerald-100 text-emerald-800" },
  sensitive: { label: "sensitive", className: "bg-amber-100 text-amber-800" },
  restricted: { label: "restricted", className: "bg-rose-100 text-rose-800" },
  app_review: { label: "app review", className: "bg-rose-100 text-rose-800" },
  unknown: { label: "unknown", className: "bg-gray-100 text-gray-700" },
};
