import "server-only";
import { CATALOG } from "../data/catalog";
import type { RawParsedItem } from "./normalize";

/**
 * LLM-backed list understanding. Server-only: the API key never reaches the browser.
 * The model is given the catalog's product + variant IDs and must answer in a strict
 * JSON schema. It is never shown prices and never asked to do arithmetic.
 */

const catalogForPrompt = CATALOG.map((p) => ({
  productId: p.id,
  name: p.name,
  soldBy: p.soldBy,
  aliases: p.aliases,
  variants: p.variants.map((v) => ({ variantId: v.id, label: v.label })),
  defaultVariantId: p.defaultVariantId,
  brands: p.offerings.map((o) => o.brand).filter((b) => b !== "STORE" && b !== "Fresh"),
}));

const SYSTEM_PROMPT = `You convert a grocery shopping request into structured items for a price-comparison app.

Rules:
- Split the request into individual grocery items. One output item per distinct product.
- Map each item to a productId and variantId from CATALOG. If nothing in CATALOG fits, set productId and variantId to null.
- quantity: for soldBy "lb" products use pounds (estimate from counts if needed, and say so in "assumption"). For other products, number of packages. "12 eggs" = one 12 ct pack.
- brand: only set if the user explicitly named a brand. Never invent a brand.
- If a detail that changes the product (type, size, flavor) was NOT stated, pick defaultVariantId (or the best guess), set confidence to "medium" or "low", explain the guess in one short sentence in "assumption", and list the plausible variantIds in alternativeVariantIds.
- If the item is clear, confidence is "high", assumption is null, alternativeVariantIds is [].
- rawText is the user's own words for that item.

CATALOG:
${JSON.stringify(catalogForPrompt)}`;

const SCHEMA = {
  name: "shopping_list",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rawText", "productId", "variantId", "brand", "quantity", "confidence", "assumption", "alternativeVariantIds"],
          properties: {
            rawText: { type: "string" },
            productId: { type: ["string", "null"] },
            variantId: { type: ["string", "null"] },
            brand: { type: ["string", "null"] },
            quantity: { type: "number" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            assumption: { type: ["string", "null"] },
            alternativeVariantIds: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

export function llmAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function llmParse(text: string): Promise<RawParsedItem[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("No API key configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_schema", json_schema: SCHEMA },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Model request failed (${res.status})`);
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    const parsed = JSON.parse(content) as { items: RawParsedItem[] };
    if (!Array.isArray(parsed.items)) throw new Error("Malformed model response");
    return parsed.items;
  } finally {
    clearTimeout(timeout);
  }
}

/** Optional: let the model phrase a recommendation from engine-computed facts only. */
export async function llmPhrase(facts: unknown): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("No API key configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You explain a grocery price comparison to a shopper in 2–3 short, plain sentences. " +
              "Use ONLY the dollar amounts provided in FACTS, copied exactly as written. Do not compute, round, or invent any number. " +
              "Explain why the recommended option wins (fees, promos, item prices) and mention substitutions if any. No markdown, no emojis.",
          },
          { role: "user", content: `FACTS:\n${JSON.stringify(facts)}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Model request failed (${res.status})`);
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}
