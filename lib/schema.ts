import { z } from "zod";

export const claimStatusSchema = z.enum([
  "tested",
  "sourced",
  "inferred",
  "unverified",
]);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;

export const blockerTypeSchema = z.enum([
  "none",
  "scope_review",
  "business_verification",
  "partner_gated",
  "paid_plan",
  "other",
]);
export type BlockerType = z.infer<typeof blockerTypeSchema>;

export const sourceSchema = z.object({
  url: z.string().url(),
  title: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

export const claimSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    status: claimStatusSchema,
    sources: z.array(sourceSchema),
    note: z.string().optional(),
  })
  .refine(
    (claim) =>
      claim.status === "inferred" ||
      claim.status === "unverified" ||
      claim.sources.length > 0,
    {
      message: "sources are required unless status is 'inferred' or 'unverified'",
      path: ["sources"],
    },
  );
export type Claim = z.infer<typeof claimSchema>;

export const actorSchema = z.enum(["agent", "human", "either"]);

export const reviewLevelSchema = z.enum([
  "none",
  "sensitive",
  "restricted",
  "app_review",
  "unknown",
]);

export const guideSchema = z.object({
  slug: z.string(),
  appName: z.string(),
  aliases: z.array(z.string()),
  website: z.string().url(),
  lastChecked: z.string(),
  generatedBy: z.enum(["seed", "agent"]),

  composio: z.object({
    managedOAuth: z.enum(["yes", "no", "unknown"]),
    whenToBringYourOwn: z.array(z.string()),
    claimIds: z.array(z.string()),
  }),

  verdict: z.object({
    oneLiner: z.string(),
    blockerType: blockerTypeSchema,
    difficulty: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    readyIn: z.object({
      min: z.string(),
      typical: z.string(),
      worst: z.string(),
    }),
    claimIds: z.array(z.string()),
  }),

  criticalPath: z.array(
    z.object({
      action: z.string(),
      why: z.string(),
      claimIds: z.array(z.string()),
    }),
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
    portalUrl: z.string().url(),
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

  gotchas: z.array(
    z.object({
      text: z.string(),
      claimIds: z.array(z.string()),
    }),
  ),

  composioHandoff: z.array(z.string()),

  claims: z.array(claimSchema),
  openQuestions: z.array(z.string()),
});
export type Guide = z.infer<typeof guideSchema>;
