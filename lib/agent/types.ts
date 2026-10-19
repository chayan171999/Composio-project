import type { Guide } from "@/lib/schema";

export type ProgressEvent =
  | { type: "stage"; message: string }
  | { type: "search"; query: string }
  | { type: "warning"; message: string }
  | { type: "done"; guide: Guide }
  | { type: "error"; message: string };

export type ComposioCheck = {
  managedOAuth: "yes" | "no" | "unknown";
  method: "api" | "docs" | "none";
  toolkitSlug?: string;
  source?: { url: string; title: string };
  detail: string;
};
