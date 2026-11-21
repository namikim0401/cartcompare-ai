import { NextResponse } from "next/server";
import { demoParse } from "@/lib/parsing/demoParser";
import { llmAvailable, llmParse } from "@/lib/parsing/llmParser";
import { toListItem, type RawParsedItem } from "@/lib/parsing/normalize";
import type { ParseResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_CHARS = 2000;

export async function POST(req: Request) {
  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "Your list is empty" }, { status: 400 });
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `Please keep your list under ${MAX_CHARS} characters` }, { status: 413 });
  }

  let raw: RawParsedItem[];
  let mode: ParseResponse["mode"] = "demo";
  let notice: string | undefined;

  if (llmAvailable()) {
    try {
      raw = await llmParse(text);
      mode = "ai";
    } catch (err) {
      console.error("[parse] LLM failed, falling back to demo parser:", err);
      raw = demoParse(text);
      notice = "The AI service didn't respond, so we used the basic demo parser. Double-check the items below.";
    }
  } else {
    raw = demoParse(text);
  }

  const items = raw.map((r) => toListItem(r, mode));
  const response: ParseResponse = { items, mode, notice };
  return NextResponse.json(response);
}
