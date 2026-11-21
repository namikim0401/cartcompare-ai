import { CATALOG, KNOWN_BRANDS, type CatalogEntry } from "../data/catalog";
import type { Confidence } from "../types";
import type { RawParsedItem } from "./normalize";

/**
 * Rule-based parser used in Demo mode (no API key) and as a fallback when the
 * LLM call fails. It is intentionally conservative: whenever it has to guess,
 * it says so via `assumption` so the Review screen can ask the user.
 */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, few: 3, half: 0.5,
};

const FILLER = /^(?:i\s+(?:need|want)|we\s+need|get\s+me|pick\s+up|get|grab|buy|please|also|plus|maybe|some|any|a\s+few|a\s+couple\s+of|a\s+couple)\s+/;
const UNIT = "(lbs?|pounds?|gallons?|gal|oz|ounces?|ct|count|packs?|bags?|loaf|loaves|bottles?|cartons?|jars?|box(?:es)?|dozen)";
const POUND = /^(lbs?|pounds?)$/;

/** Rough weights so "3 bananas" can become an estimated weight. */
const EACH_WEIGHT_LB: Record<string, number> = { bananas: 0.4, apples: 0.5, tomatoes: 0.25, "chicken-breast": 0.5, salmon: 0.5 };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z0-9%])${esc(word)}($|[^a-z0-9%])`).test(text);

export function splitSegments(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"]/g, "")
    .split(/,|;|\n|\.\s|\.$|\band\b|&|\+/)
    .map((s) => {
      let t = s.trim().replace(/\bplease\b/g, "").trim();
      for (let i = 0; i < 4; i++) t = t.replace(FILLER, "").trim();
      return t;
    })
    .filter((s) => s.length > 1);
}

function findProduct(segment: string): CatalogEntry | null {
  let best: { p: CatalogEntry; len: number } | null = null;
  for (const p of CATALOG) {
    for (const alias of p.aliases) {
      if ((hasWord(segment, alias) || hasWord(segment, `${alias}s`)) && (!best || alias.length > best.len)) {
        best = { p, len: alias.length };
      }
    }
  }
  return best?.p ?? null;
}

function findBrand(segment: string): string | null {
  const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "");
  const text = norm(segment);
  const brand = KNOWN_BRANDS.find((b) => text.includes(norm(b)));
  // A brand the product doesn't carry is still returned: normalize() turns it
  // into a visible "not in catalog for this product" note instead of hiding it.
  return brand ?? null;
}

function readQuantity(segment: string): { n: number | null; unit: string | null } {
  const m = segment.match(new RegExp(`^(\\d+(?:\\.\\d+)?|${Object.keys(NUMBER_WORDS).join("|")})\\s*(?:${UNIT}\\b)?`));
  let n: number | null = null;
  let unit: string | null = null;
  if (m) {
    n = /^\d/.test(m[1]) ? parseFloat(m[1]) : NUMBER_WORDS[m[1]];
    unit = m[2] ?? null;
  }
  if (/\bdozen\b/.test(segment)) {
    n = (unit === "dozen" ? n ?? 1 : 1) * 12;
    unit = "ct";
  }
  if (/\bhalf[\s-]gallon\b/.test(segment) && n === 0.5) n = 1;
  return { n, unit };
}

export function parseSegment(segment: string): RawParsedItem {
  const product = findProduct(segment);
  if (!product) {
    return {
      rawText: segment, productId: null, variantId: null, brand: null, quantity: 1,
      confidence: "low", assumption: null, alternativeVariantIds: [],
    };
  }

  const brand = findBrand(segment);
  const { n, unit } = readQuantity(segment);
  let quantity = n ?? 1;
  let confidence: Confidence = "high";
  const assumptions: string[] = [];
  let forcedVariant: string | null = null;

  if (product.soldBy === "lb") {
    if (unit && POUND.test(unit)) quantity = n ?? 1;
    else if (n != null) {
      const per = EACH_WEIGHT_LB[product.id] ?? 0.5;
      quantity = Math.max(0.25, Math.round(n * per * 4) / 4);
      assumptions.push(`Sold by weight — we estimated ${quantity} lb for ${n}.`);
      confidence = "medium";
    } else {
      quantity = 1;
      assumptions.push("Amount not specified — we suggested 1 lb.");
      confidence = "medium";
    }
  } else if (n != null && product.variants.some((v) => v.count)) {
    // Pack-count products: "12 eggs" → one 12 ct pack; "24 eggs" → two.
    const exact = product.variants.find((v) => v.count === n);
    const divisor = product.variants.filter((v) => v.count && v.count > 1 && n % v.count === 0).sort((a, b) => b.count! - a.count!)[0];
    const single = product.variants.find((v) => !v.count || v.count === 1);
    if (exact) { forcedVariant = exact.id; quantity = 1; }
    else if (divisor) { forcedVariant = divisor.id; quantity = n / divisor.count!; }
    else if (single) { forcedVariant = single.id; quantity = n; }
    else {
      const closest = product.variants.reduce((a, b) => (Math.abs((b.count ?? 0) - n) < Math.abs((a.count ?? 0) - n) ? b : a));
      forcedVariant = closest.id; quantity = 1;
      assumptions.push(`No ${n}-count pack in the catalog — we suggested ${closest.label}.`);
      confidence = "medium";
    }
  } else if (n != null && n < 1) {
    quantity = 1;
  }

  // Score variants by keyword evidence in the text.
  let variantId = forcedVariant;
  let alternatives: string[] = [];
  if (!variantId) {
    const scored = product.variants.map((v) => ({ v, score: v.keywords.filter((k) => hasWord(segment, k)).length }));
    const top = Math.max(...scored.map((s) => s.score));
    const tied = scored.filter((s) => s.score === top).map((s) => s.v);
    if (product.variants.length === 1) variantId = product.variants[0].id;
    else if (top > 0 && tied.length === 1) variantId = tied[0].id;
    else {
      const pick = tied.find((v) => v.id === product.defaultVariantId) ?? tied[0];
      variantId = pick.id;
      alternatives = tied.map((v) => v.id);
      assumptions.push(
        top > 0
          ? `Couldn't tell which ${product.name.toLowerCase()} — we suggested ${pick.label}.`
          : `Which ${product.name.toLowerCase()}? Not specified, so we suggested ${pick.label}.`,
      );
      confidence = top > 0 ? "medium" : "low";
    }
  }

  return {
    rawText: segment,
    productId: product.id,
    variantId,
    brand,
    quantity,
    confidence,
    assumption: assumptions.length ? assumptions.join(" ") : null,
    alternativeVariantIds: alternatives,
  };
}

export function demoParse(text: string): RawParsedItem[] {
  return splitSegments(text).map(parseSegment);
}
