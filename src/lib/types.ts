/**
 * Core domain model for CartCompare.
 *
 * Two layers are deliberately kept apart:
 *   1. Understanding (AI or demo parser) → turns language into `ListItem`s that
 *      point at catalog product + variant IDs. It never sees a price.
 *   2. Pricing (deterministic engine) → turns `ListItem`s + preferences into
 *      `CartQuote`s. It never sees free text.
 *
 * All money is integer cents to avoid floating-point drift.
 */

export type Cents = number;

export type Category =
  | "Dairy & Eggs"
  | "Produce"
  | "Bakery"
  | "Pantry"
  | "Meat & Seafood"
  | "Frozen"
  | "Beverages"
  | "Household";

export type SoldBy = "each" | "lb";

/* ----------------------------- Catalog ----------------------------- */

export interface Variant {
  id: string;
  /** Human label shown to the user, e.g. "2% · 1 gal" */
  label: string;
  /** Words that, if present in the request, point at this variant. */
  keywords: string[];
  /** For pack-count products (eggs), lets "12 eggs" resolve to a 12 ct pack. */
  count?: number;
}

export interface CanonicalProduct {
  id: string;
  name: string;
  category: Category;
  soldBy: SoldBy;
  aliases: string[];
  variants: Variant[];
  defaultVariantId: string;
  taxable: boolean;
}

export interface Store {
  id: StoreId;
  name: string;
  storeBrand: string;
  /** Estimated sales tax applied to taxable items only. */
  taxRate: number;
}

export type StoreId = "target" | "safeway";
export type PlatformId = "doordash" | "ubereats" | "instacart";

/** A specific product offered by a store at its shelf price. */
export interface Sku {
  id: string;
  storeId: StoreId;
  productId: string;
  variantId: string;
  brand: string;
  isStoreBrand: boolean;
  /** In-store shelf price, per unit or per lb. */
  shelfPrice: Cents;
}

export interface PlatformFees {
  delivery: { base: Cents; reducedOver?: { threshold: Cents; fee: Cents } };
  service: { rate: number; min: Cents; max?: Cents };
  smallOrder?: { threshold: Cents; fee: Cents };
  pickup: { supported: boolean; fee: Cents; serviceRate: number };
  promo?: { label: string; threshold: Cents; amount: Cents };
}

export interface Platform {
  id: PlatformId;
  name: string;
  fees: PlatformFees;
}

/** A store as sold through one delivery platform. */
export interface Channel {
  id: string;
  platformId: PlatformId;
  storeId: StoreId;
  /** Platform price vs in-store shelf price (1.10 = 10% higher). */
  itemMarkup: number;
  pickupAvailable: boolean;
}

/* --------------------------- Shopping list -------------------------- */

export type Confidence = "high" | "medium" | "low";

export interface ReviewFlag {
  /** Plain-language reason shown to the user. */
  message: string;
  /** Variant choices the user can pick from. */
  options: { variantId: string; label: string }[];
}

export interface ListItem {
  id: string;
  /** What the user actually typed for this item. */
  rawText: string;
  /** null = we could not map it to the catalog. */
  productId: string | null;
  variantId: string | null;
  displayName: string;
  /** null = no brand preference. */
  brand: string | null;
  quantity: number;
  soldBy: SoldBy;
  category: Category | null;
  confidence: Confidence;
  /** Present when the parser made an assumption the user should confirm. */
  review: ReviewFlag | null;
  source: "ai" | "demo" | "user";
}

export interface ParseResponse {
  items: ListItem[];
  mode: "ai" | "demo";
  /** Shown to the user, e.g. when AI failed and we fell back to demo parsing. */
  notice?: string;
}

/* ---------------------------- Preferences --------------------------- */

export type Fulfillment = "delivery" | "pickup";

export interface Preferences {
  stores: StoreId[];
  /** When true, brand preferences are soft: cheapest same-size item wins. */
  brandFlexible: boolean;
  allowSubstitutions: boolean;
  fulfillment: Fulfillment;
}

/* ------------------------------ Quotes ------------------------------ */

export type LineStatus = "matched" | "substituted" | "missing";

export interface QuoteLine {
  itemId: string;
  itemName: string;
  status: LineStatus;
  sku: Sku | null;
  variantLabel: string | null;
  unitPrice: Cents;
  quantity: number;
  lineTotal: Cents;
  /** Plain-language note about what changed, if anything. */
  note: string | null;
  brandChanged: boolean;
}

export interface CartQuote {
  channelId: string;
  platformId: PlatformId;
  storeId: StoreId;
  label: string;
  lines: QuoteLine[];
  subtotal: Cents;
  deliveryFee: Cents;
  serviceFee: Cents;
  smallOrderFee: Cents;
  pickupFee: Cents;
  tax: Cents;
  discount: Cents;
  discountLabel: string | null;
  total: Cents;
  missingCount: number;
  substitutedCount: number;
  /** Complete carts are ranked; incomplete ones are listed separately. */
  complete: boolean;
  /** Set when the channel can't serve this request at all (e.g. no pickup). */
  unavailableReason: string | null;
}

export interface ExplainResponse {
  text: string;
  source: "ai" | "template";
  /** Why the AI text wasn't used, when relevant. */
  note?: string;
}
