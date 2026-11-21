import type { Confidence, ListItem, ReviewFlag } from "../types";
import { getProduct } from "../data/catalog";

/** What any parser (LLM or rule-based) is allowed to claim about an item. */
export interface RawParsedItem {
  rawText: string;
  productId: string | null;
  variantId: string | null;
  brand: string | null;
  quantity: number;
  confidence: Confidence;
  /** Plain-language description of any assumption made. */
  assumption: string | null;
  alternativeVariantIds: string[];
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Validate a parser's claim against the catalog. Anything the catalog can't back
 * up is downgraded to a visible review flag instead of silently trusted.
 */
export function toListItem(raw: RawParsedItem, source: ListItem["source"]): ListItem {
  const product = getProduct(raw.productId);
  const rawText = raw.rawText.trim();

  if (!product) {
    return {
      id: newId(),
      rawText,
      productId: null,
      variantId: null,
      displayName: capitalize(rawText || "Unknown item"),
      brand: null,
      quantity: Math.max(1, Math.round(raw.quantity || 1)),
      soldBy: "each",
      category: null,
      confidence: "low",
      review: {
        message: "We couldn't find this in the demo catalog. Rephrase it, or remove it — it won't be priced.",
        options: [],
      },
      source,
    };
  }

  let confidence = raw.confidence;
  const notes: string[] = [];

  let variant = product.variants.find((v) => v.id === raw.variantId);
  if (!variant) {
    variant = product.variants.find((v) => v.id === product.defaultVariantId)!;
    if (product.variants.length > 1 && !raw.assumption) {
      notes.push(`Size not specified — we suggested ${variant.label}.`);
      if (confidence === "high") confidence = "medium";
    }
  }
  if (raw.assumption) notes.push(raw.assumption);

  // Brand must be one the catalog actually carries for this product.
  let brand: string | null = null;
  if (raw.brand) {
    const known = product.offerings.map((o) => o.brand).find((b) => b.toLowerCase() === raw.brand!.toLowerCase());
    if (known && known !== "STORE" && known !== "Fresh") brand = known;
    else {
      notes.push(`“${raw.brand}” isn't in the demo catalog for ${product.name.toLowerCase()}, so any brand will be compared.`);
      if (confidence === "high") confidence = "medium";
    }
  }

  let quantity = Number.isFinite(raw.quantity) && raw.quantity > 0 ? raw.quantity : 1;
  quantity = product.soldBy === "lb" ? Math.max(0.25, Math.round(quantity * 4) / 4) : Math.max(1, Math.round(quantity));
  quantity = Math.min(quantity, 50);

  let review: ReviewFlag | null = null;
  if (notes.length > 0) {
    const optionIds = Array.from(new Set([variant.id, ...raw.alternativeVariantIds]));
    const options = optionIds
      .map((id) => product.variants.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => !!v)
      .map((v) => ({ variantId: v.id, label: v.label }));
    // If the parser gave no alternatives but the product has several variants, offer them all.
    const allOptions =
      options.length <= 1 && product.variants.length > 1
        ? product.variants.map((v) => ({ variantId: v.id, label: v.label }))
        : options;
    review = { message: notes.join(" "), options: allOptions.length > 1 ? allOptions : [] };
    if (confidence === "high") confidence = "medium";
  }

  return {
    id: newId(),
    rawText,
    productId: product.id,
    variantId: variant.id,
    displayName: product.name,
    brand,
    quantity,
    soldBy: product.soldBy,
    category: product.category,
    confidence,
    review,
    source,
  };
}
