import type { ComposioCheck } from "./types";

const API_BASE = "https://backend.composio.dev/api/v3.1/toolkits";
const DOCS_BASE = "https://docs.composio.dev/toolkits";

export function toolkitSlugCandidates(query: string, appName?: string): string[] {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/https?:\/\//, "")
      .replace(/\.(com|io|dev|org|net|co)\b.*$/, "")
      .replace(/[^a-z0-9]+/g, "");

  const candidates = [appName, query]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [normalize(value), normalize(value.split(/[\s/]+/)[0] ?? "")]);

  return [...new Set(candidates.filter((slug) => slug.length > 1))];
}

async function checkViaApi(
  slug: string,
  apiKey: string,
): Promise<ComposioCheck | null> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(slug)}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!response.ok) return null;

  const body = await response.json();
  const schemes: unknown = body?.composio_managed_auth_schemes;
  const list = Array.isArray(schemes) ? schemes.map(String) : [];
  const hasOAuth = list.some((scheme) => scheme.toUpperCase().includes("OAUTH"));

  return {
    managedOAuth: list.length === 0 ? "no" : hasOAuth ? "yes" : "no",
    method: "api",
    toolkitSlug: slug,
    source: {
      url: `${DOCS_BASE}/${slug}`,
      title: `Composio — ${slug} toolkit`,
    },
    detail: `Composio API reports composio_managed_auth_schemes: [${list.join(", ") || "none"}] for toolkit "${slug}".`,
  };
}

async function checkViaDocs(slug: string): Promise<ComposioCheck | null> {
  const url = `${DOCS_BASE}/${slug}`;
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) return null;

  return {
    managedOAuth: "unknown",
    method: "docs",
    toolkitSlug: slug,
    source: { url, title: `Composio — ${slug} toolkit docs` },
    detail: `No Composio API key configured. A toolkit docs page exists at ${url}; managed OAuth status must be read from that page and labelled "sourced", not "tested".`,
  };
}

export async function checkComposio(candidates: string[]): Promise<ComposioCheck> {
  const apiKey = process.env.COMPOSIO_API_KEY;

  for (const slug of candidates) {
    try {
      const result = apiKey
        ? await checkViaApi(slug, apiKey)
        : await checkViaDocs(slug);
      if (result) return result;
    } catch {
      // Network failures fall through to the next candidate, then to "unknown".
    }
  }

  return {
    managedOAuth: "unknown",
    method: "none",
    detail: apiKey
      ? `No Composio toolkit matched any of: ${candidates.join(", ")}.`
      : `No Composio API key configured and no toolkit docs page matched any of: ${candidates.join(", ")}.`,
  };
}
