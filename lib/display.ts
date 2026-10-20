import type { BlockerType, ClaimStatus } from "./schema";

type Tone = {
  label: string;
  /** Background + text pair, for chips. */
  chip: string;
  /** Foreground only, for dots, rules and icons. */
  fg: string;
};

export const BLOCKER_TONE: Record<BlockerType, Tone> = {
  none: { label: "No review", chip: "bg-ok-soft text-ok", fg: "text-ok" },
  scope_review: {
    label: "Scope review",
    chip: "bg-warn-soft text-warn",
    fg: "text-warn",
  },
  business_verification: {
    label: "Business verification",
    chip: "bg-risk-soft text-risk",
    fg: "text-risk",
  },
  partner_gated: {
    label: "Partner-gated",
    chip: "bg-risk-soft text-risk",
    fg: "text-risk",
  },
  paid_plan: { label: "Paid plan", chip: "bg-info-soft text-info", fg: "text-info" },
  other: { label: "Other", chip: "bg-sunken text-ink-2", fg: "text-ink-2" },
};

// Review level drives how long a guide's timeline runs, so it shares the blocker
// palette rather than inventing a second colour language.
export const REVIEW_LEVEL_TONE: Record<string, Tone> = {
  none: { label: "none", chip: "bg-ok-soft text-ok", fg: "text-ok" },
  sensitive: { label: "sensitive", chip: "bg-warn-soft text-warn", fg: "text-warn" },
  restricted: { label: "restricted", chip: "bg-risk-soft text-risk", fg: "text-risk" },
  app_review: { label: "app review", chip: "bg-risk-soft text-risk", fg: "text-risk" },
  unknown: { label: "unknown", chip: "bg-sunken text-ink-3", fg: "text-ink-3" },
};

export const CLAIM_TONE: Record<ClaimStatus, Tone> = {
  tested: { label: "Tested", chip: "bg-ok-soft text-ok", fg: "text-ok" },
  sourced: { label: "Sourced", chip: "bg-accent-soft text-accent", fg: "text-accent" },
  inferred: { label: "Inferred", chip: "bg-warn-soft text-warn", fg: "text-warn" },
  unverified: { label: "Unverified", chip: "bg-risk-soft text-risk", fg: "text-risk" },
};

export const ACTOR_LABEL: Record<string, string> = {
  agent: "Agent",
  human: "You",
  either: "Either",
};
