import fs from "fs";
import path from "path";
import { guideSchema, type Guide } from "./schema";

const SEED_GUIDES_DIR = path.join(process.cwd(), "data", "guides");

function loadSeedGuides(): Guide[] {
  const files = fs
    .readdirSync(SEED_GUIDES_DIR)
    .filter((file) => file.endsWith(".json"));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(SEED_GUIDES_DIR, file), "utf-8");
    const parsed = guideSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error(
        `Invalid seed guide "${file}": ${parsed.error.message}`,
      );
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
