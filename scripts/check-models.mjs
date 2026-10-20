// Lists the Gemini models the configured key can actually reach, so the agent's
// default model ID is verified against the API rather than guessed from docs.
import { readFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const apiKey = env.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
if (!apiKey) {
  console.error("No GEMINI_API_KEY found in .env.local");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const names = [];
for await (const model of await ai.models.list()) {
  names.push(model.name?.replace(/^models\//, "") ?? "");
}

console.log(`${names.length} models reachable.`);
console.log(names.filter((n) => n.includes("flash") || n.includes("pro")).join("\n"));
