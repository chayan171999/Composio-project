// Probes which retrieval tools the configured key can actually use, so the agent's
// design is chosen from what the free tier allows rather than from pricing pages.
import { readFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const apiKey = env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
const ai = new GoogleGenAI({ apiKey });

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

const cases = [
  ["plain", {}, "Reply with the single word: ok"],
  ["googleSearch", { tools: [{ googleSearch: {} }] }, "What is the current stable Node.js LTS version?"],
  [
    "urlContext",
    { tools: [{ urlContext: {} }] },
    "Read https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app and list the required fields when registering an OAuth app. Cite the URL.",
  ],
];

for (const [label, config, prompt] of cases) {
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { maxOutputTokens: 4000, ...config },
    });
    const meta = res.candidates?.[0]?.urlContextMetadata;
    const retrieved = meta?.urlMetadata
      ?.map((u) => `${u.retrievedUrl ?? u.retrievedUrl} [${u.urlRetrievalStatus}]`)
      .join(", ");
    console.log(`PASS  ${label} -> ${JSON.stringify(res.text?.slice(0, 120))}`);
    if (retrieved) console.log(`      retrieved: ${retrieved}`);
  } catch (err) {
    const msg = String(err?.message ?? err);
    const code = msg.match(/"code":\s*(\d+)/)?.[1] ?? "?";
    const reason = msg.match(/"status":\s*"([A-Z_]+)"/)?.[1] ?? msg.slice(0, 100);
    console.log(`FAIL  ${label} -> ${code} ${reason}`);
  }
}
