import { NextResponse } from "next/server";
import { compareCarts } from "@/lib/pricing/engine";
import { mockProvider } from "@/lib/pricing/provider";
import { buildFacts, templateExplanation, verifyExplanation } from "@/lib/recommend/explain";
import { llmAvailable, llmPhrase } from "@/lib/parsing/llmParser";
import type { ExplainResponse, ListItem, Preferences } from "@/lib/types";

export const runtime = "nodejs";

/**
 * The client sends the list + preferences, never prices. The server recomputes
 * quotes with the same deterministic engine, so the facts can't be tampered with.
 */
export async function POST(req: Request) {
  let items: ListItem[];
  let prefs: Preferences;
  try {
    const body = await req.json();
    items = Array.isArray(body?.items) ? body.items.filter((i: ListItem) => i && typeof i.productId === "string") : [];
    prefs = body?.prefs;
    if (!prefs || !Array.isArray(prefs.stores)) throw new Error("bad prefs");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const facts = buildFacts(compareCarts(items, prefs, mockProvider));
  const fallback = templateExplanation(facts);

  if (!llmAvailable() || !facts.recommended) {
    return NextResponse.json<ExplainResponse>({ text: fallback, source: "template" });
  }

  try {
    const text = await llmPhrase(facts);
    const check = verifyExplanation(text, facts);
    if (!check.ok) {
      console.warn("[explain] rejected AI text with ungrounded numbers:", check.unexpected);
      return NextResponse.json<ExplainResponse>({
        text: fallback,
        source: "template",
        note: "The AI draft quoted numbers the pricing engine didn't produce, so we showed the engine's summary instead.",
      });
    }
    return NextResponse.json<ExplainResponse>({ text, source: "ai" });
  } catch (err) {
    console.error("[explain] LLM failed:", err);
    return NextResponse.json<ExplainResponse>({ text: fallback, source: "template" });
  }
}
