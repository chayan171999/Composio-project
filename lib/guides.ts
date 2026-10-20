import fs from "fs";
import path from "path";
import { guideSchema, type Guide } from "./schema";
import { getStoredGuide, listStoredGuides } from "./store";

const SEED_GUIDES_DIR = path.join(process.cwd(), "data", "guides");

function loadSeedGuides(): Guide[] {
  const files = fs
    .readdirSync(SEED_GUIDES_DIR)
    .filter((file) => file.endsWith(".json"));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(SEED_GUIDES_DIR, file), "utf-8");
    const parsed = guideSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(`Invalid seed guide "${file}": ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

export function getAllSeedGuides(): Guide[] {
  return loadSeedGuides();
}

export function getSeedGuide(slug: string): Guide | undefined {
  return loadSeedGuides().find((guide) => guide.slug === slug);
}

// data/guides holds two kinds of file: hand-verified seeds, and agent guides
// bundled so the deployed library is not empty. A seed always wins its slug. A
// bundled agent guide is only a cached copy, so regenerating one supersedes it —
// otherwise "Regenerate" would write to the store and change nothing on screen.
export async function getGuide(slug: string): Promise<Guide | null> {
  const bundled = getSeedGuide(slug);
  if (bundled?.generatedBy === "seed") return bundled;
  return (await getStoredGuide(slug)) ?? bundled ?? null;
}

export async function getAllGuides(): Promise<Guide[]> {
  const bySlug = new Map<string, Guide>();
  for (const guide of loadSeedGuides()) bySlug.set(guide.slug, guide);
  for (const guide of await listStoredGuides()) {
    if (bySlug.get(guide.slug)?.generatedBy === "seed") continue;
    bySlug.set(guide.slug, guide);
  }
  return [...bySlug.values()];
}

function domainOf(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];
}

export function matchGuide(guides: Guide[], query: string): Guide | undefined {
  const needle = query.trim().toLowerCase();
  if (!needle) return undefined;

  const needleDomain = domainOf(needle);

  return guides.find((guide) => {
    const haystack = [guide.slug, guide.appName, ...guide.aliases].map((value) =>
      value.toLowerCase(),
    );
    if (haystack.includes(needle)) return true;
    if (haystack.some((value) => domainOf(value) === needleDomain)) return true;
    return domainOf(guide.website) === needleDomain;
  });
}
