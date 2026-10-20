import fs from "fs";
import path from "path";
import { Redis } from "@upstash/redis";
import { guideSchema, type Guide } from "./schema";

const INDEX_KEY = "guides:index";
const guideKey = (slug: string) => `guide:${slug}`;

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Local dev has no KV, and Vercel's filesystem is read-only outside /tmp, so this
// file fallback only ever runs locally. Production needs the Upstash env vars.
const DEV_FILE = path.join(process.cwd(), ".data", "guides.json");

function readDevFile(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(DEV_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeDevFile(all: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(DEV_FILE), { recursive: true });
  fs.writeFileSync(DEV_FILE, JSON.stringify(all, null, 2));
}

function parseGuide(value: unknown): Guide | null {
  const parsed = guideSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function isKvConfigured(): boolean {
  return redis !== null;
}

export async function saveGuide(guide: Guide): Promise<void> {
  if (redis) {
    await redis.set(guideKey(guide.slug), guide);
    await redis.sadd(INDEX_KEY, guide.slug);
    return;
  }

  const all = readDevFile();
  all[guide.slug] = guide;
  writeDevFile(all);
}

export async function getStoredGuide(slug: string): Promise<Guide | null> {
  if (redis) {
    return parseGuide(await redis.get(guideKey(slug)));
  }
  return parseGuide(readDevFile()[slug]);
}

export async function listStoredGuides(): Promise<Guide[]> {
  if (redis) {
    const slugs = await redis.smembers(INDEX_KEY);
    if (slugs.length === 0) return [];
    const values = await Promise.all(slugs.map((slug) => redis.get(guideKey(slug))));
    return values
      .map(parseGuide)
      .filter((guide): guide is Guide => guide !== null);
  }

  return Object.values(readDevFile())
    .map(parseGuide)
    .filter((guide): guide is Guide => guide !== null);
}
