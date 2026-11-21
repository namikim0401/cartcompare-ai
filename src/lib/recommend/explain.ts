import type { CartQuote } from "../types";
import { money } from "../money";

/**
 * Recommendation facts are derived ONLY from engine output, pre-formatted as
 * strings. Whoever writes the sentence (template or LLM) can only quote these.
 */
export interface RecommendationFacts {
  recommended: {
    option: string;
    total: string;
    itemSubtotal: string;
    fees: string;
    tax: string;
    promo: string | null;
    substitutions: string[];
    brandSwaps: string[];
  } | null;
  runnerUp: { option: string; total: string; costsMoreBy: string; fees: string; itemSubtotal: string } | null;
  lowestItemSubtotal: { option: string; itemSubtotal: string; fees: string; total: string } | null;
  mostExpensive: { option: string; total: string; youSave: string } | null;
  incompleteOptions: { option: string; missingItems: number }[];
  completeOptionCount: number;
}

const fees = (q: CartQuote) => q.deliveryFee + q.serviceFee + q.smallOrderFee + q.pickupFee;

export function buildFacts(ranked: CartQuote[]): RecommendationFacts {
  const complete = ranked.filter((q) => q.complete);
  const incomplete = ranked.filter((q) => !q.complete && !q.unavailableReason);
  const w = complete[0];
  const facts: RecommendationFacts = {
    recommended: null,
    runnerUp: null,
    lowestItemSubtotal: null,
    mostExpensive: null,
    incompleteOptions: incomplete.map((q) => ({ option: q.label, missingItems: q.missingCount })),
    completeOptionCount: complete.length,
  };
  if (!w) return facts;

  facts.recommended = {
    option: w.label,
    total: money(w.total),
    itemSubtotal: money(w.subtotal),
    fees: money(fees(w)),
    tax: money(w.tax),
    promo: w.discount > 0 ? `${money(w.discount)} off` : null,
    substitutions: w.lines.filter((l) => l.status === "substituted").map((l) => `${l.itemName}: ${l.note}`),
    brandSwaps: w.lines.filter((l) => l.status === "matched" && l.brandChanged).map((l) => `${l.itemName}: ${l.note}`),
  };

  const r = complete[1];
  if (r) {
    facts.runnerUp = {
      option: r.label,
      total: money(r.total),
      costsMoreBy: money(r.total - w.total),
      fees: money(fees(r)),
      itemSubtotal: money(r.subtotal),
    };
  }

  const low = complete.reduce((a, b) => (b.subtotal < a.subtotal ? b : a), w);
  if (low.channelId !== w.channelId && low.subtotal < w.subtotal) {
    facts.lowestItemSubtotal = { option: low.label, itemSubtotal: money(low.subtotal), fees: money(fees(low)), total: money(low.total) };
  }

  const max = complete[complete.length - 1];
  if (max && max.channelId !== w.channelId && max.total > w.total) {
    facts.mostExpensive = { option: max.label, total: money(max.total), youSave: money(max.total - w.total) };
  }
  return facts;
}

/** Deterministic explanation. Always available, used in Demo mode and as the fallback. */
export function templateExplanation(f: RecommendationFacts): string {
  if (!f.recommended) {
    if (f.incompleteOptions.length === 0) return "There are no options to compare with your current preferences. Try allowing more stores or switching to delivery.";
    return "None of the options has every item on your list, so none is recommended. Turning on substitutions or brand flexibility usually fixes this.";
  }
  const w = f.recommended;
  const parts: string[] = [`${w.option} has the lowest estimated total at ${w.total}.`];

  if (f.lowestItemSubtotal) {
    const l = f.lowestItemSubtotal;
    parts.push(
      `${l.option} has a lower item subtotal (${l.itemSubtotal} vs ${w.itemSubtotal}), but ${l.fees} in fees bring it to ${l.total}.`,
    );
  } else if (f.runnerUp) {
    parts.push(`It's ${f.runnerUp.costsMoreBy} less than the next-best option, ${f.runnerUp.option}.`);
  }
  if (w.promo) parts.push(`That includes a ${w.promo} promo.`);
  if (f.mostExpensive) parts.push(`Versus the most expensive complete cart, you'd save ${f.mostExpensive.youSave}.`);
  if (w.substitutions.length) {
    parts.push(`${w.substitutions.length} item${w.substitutions.length > 1 ? "s" : ""} would be substituted — review below.`);
  }
  return parts.join(" ");
}

/** Every dollar figure the explanation is allowed to contain. */
export function allowedAmounts(f: RecommendationFacts): Set<string> {
  const found = JSON.stringify(f).match(/\$[\d,]+\.\d{2}/g) ?? [];
  return new Set(found);
}

/**
 * Grounding check for model-written text: every money-like number must be one
 * the engine produced. Anything else (a rounded figure, a computed difference
 * the engine didn't supply) fails, and we fall back to the template.
 */
export function verifyExplanation(text: string, f: RecommendationFacts): { ok: boolean; unexpected: string[] } {
  const allowed = allowedAmounts(f);
  const amounts = text.match(/\$?\d[\d,]*(?:\.\d+)?/g) ?? [];
  const unexpected = amounts.filter((a) => {
    if (a.startsWith("$")) return !allowed.has(/\.\d{2}$/.test(a) ? a : `${a}.00`) && !allowed.has(a);
    // Bare numbers: allow small counts ("2 items"), reject anything that looks like money.
    return a.includes(".") || Number(a.replace(/,/g, "")) > 20;
  });
  return { ok: unexpected.length === 0, unexpected };
}
