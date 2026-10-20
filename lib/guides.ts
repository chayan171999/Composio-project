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

// Seed guides are hand-verified, so they win over a generated guide of the same slug.
export async function getGuide(slug: string): Promise<Guide | null> {
  return getSeedGuide(slug) ?? (await getStoredGuide(slug));
}

export async function getAllGuides(): Promise<Guide[]> {
  const seeds = loadSeedGuides();
  const seedSlugs = new Set(seeds.map((guide) => guide.slug));
  const stored = (await listStoredGuides()).filter(
    (guide) => !seedSlugs.has(guide.slug),
  );
  return [...seeds, ...stored];
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
