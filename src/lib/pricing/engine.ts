import type { CartQuote, Channel, Cents, ListItem, Preferences, QuoteLine } from "../types";
import { getProduct, getVariant } from "../data/catalog";
import { PLATFORMS, STORES, channelLabel } from "../data/market";
import type { Offer, PriceProvider } from "./provider";

/**
 * Deterministic cart pricing. Pure functions only: same items + preferences +
 * provider data always produce the same quotes. No AI is involved here.
 */

const cheapest = (offers: Offer[]): Offer | undefined =>
  offers.reduce<Offer | undefined>((best, o) => (!best || o.price < best.price ? o : best), undefined);

const sameBrand = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function line(item: ListItem, offer: Offer | undefined, status: QuoteLine["status"], note: string | null): QuoteLine {
  const unitPrice = offer?.price ?? 0;
  return {
    itemId: item.id,
    itemName: item.displayName,
    status,
    sku: offer?.sku ?? null,
    variantLabel: offer ? (getVariant(offer.sku.productId, offer.sku.variantId)?.label ?? null) : null,
    unitPrice,
    quantity: item.quantity,
    lineTotal: Math.round(unitPrice * item.quantity),
    note,
    brandChanged: !!(offer && item.brand && !sameBrand(offer.sku.brand, item.brand)),
  };
}

/** Match one list item against the offers on one channel. */
export function matchItem(item: ListItem, offers: Offer[], prefs: Preferences): QuoteLine {
  const product = getProduct(item.productId);
  if (!product) return line(item, undefined, "missing", "Not in the demo catalog");

  const variantId = item.variantId ?? product.defaultVariantId;
  const inStock = offers.filter((o) => o.inStock);
  const sameVariant = inStock.filter((o) => o.sku.variantId === variantId);
  const strictBrand = !!item.brand && !prefs.brandFlexible;

  // 1. Exact match (respecting brand if the user insists on one).
  const exact = strictBrand ? sameVariant.filter((o) => sameBrand(o.sku.brand, item.brand!)) : sameVariant;
  const best = cheapest(exact);
  if (best) {
    const swapped = item.brand && !sameBrand(best.sku.brand, item.brand);
    return line(item, best, "matched", swapped ? `${best.sku.brand} instead of ${item.brand} — any brand allowed` : null);
  }

  // 2. Substitutions, if allowed: same size other brand, then nearest size.
  if (prefs.allowSubstitutions) {
    const otherBrand = cheapest(sameVariant);
    if (otherBrand) {
      return line(item, otherBrand, "substituted", `${item.brand} unavailable — substituted ${otherBrand.sku.brand}`);
    }
    const order = product.variants.map((x) => x.id);
    const wantIdx = order.indexOf(variantId);
    const nearest = [...inStock].sort(
      (a, b) =>
        Math.abs(order.indexOf(a.sku.variantId) - wantIdx) - Math.abs(order.indexOf(b.sku.variantId) - wantIdx) ||
        a.price - b.price,
    )[0];
    if (nearest) {
      const want = getVariant(product.id, variantId)?.label ?? "Requested size";
      const got = getVariant(product.id, nearest.sku.variantId)?.label ?? "another size";
      return line(item, nearest, "substituted", `${want} unavailable — substituted ${got}`);
    }
  }

  // 3. Missing. Explain why, specifically.
  const carried = offers.some((o) => o.sku.variantId === variantId);
  let why = carried ? "Out of stock on this platform" : "Not carried at this store";
  if (strictBrand && sameVariant.length > 0) why = `${item.brand} unavailable here`;
  if (!prefs.allowSubstitutions && inStock.length > 0) why += " (substitutions off)";
  return line(item, undefined, "missing", why);
}

function computeFees(channel: Channel, lines: QuoteLine[], prefs: Preferences) {
  const platform = PLATFORMS[channel.platformId];
  const store = STORES[channel.storeId];
  const f = platform.fees;

  const subtotal: Cents = lines.reduce((s, l) => s + l.lineTotal, 0);
  const taxableSubtotal: Cents = lines
    .filter((l) => l.sku && getProduct(l.sku.productId)?.taxable)
    .reduce((s, l) => s + l.lineTotal, 0);

  let deliveryFee = 0;
  let serviceFee = 0;
  let smallOrderFee = 0;
  let pickupFee = 0;

  if (prefs.fulfillment === "delivery") {
    deliveryFee = f.delivery.reducedOver && subtotal >= f.delivery.reducedOver.threshold ? f.delivery.reducedOver.fee : f.delivery.base;
    serviceFee = Math.max(f.service.min, Math.round(subtotal * f.service.rate));
    if (f.service.max) serviceFee = Math.min(serviceFee, f.service.max);
    if (f.smallOrder && subtotal < f.smallOrder.threshold) smallOrderFee = f.smallOrder.fee;
  } else {
    pickupFee = f.pickup.fee;
    serviceFee = Math.round(subtotal * f.pickup.serviceRate);
  }

  const tax = Math.round(taxableSubtotal * store.taxRate);
  const promoApplies = !!f.promo && subtotal >= f.promo.threshold;
  const discount = promoApplies ? f.promo!.amount : 0;
  const total = subtotal + deliveryFee + serviceFee + smallOrderFee + pickupFee + tax - discount;

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    smallOrderFee,
    pickupFee,
    tax,
    discount,
    discountLabel: promoApplies ? f.promo!.label : null,
    total,
  };
}

export function quoteChannel(channel: Channel, items: ListItem[], prefs: Preferences, provider: PriceProvider): CartQuote {
  const platform = PLATFORMS[channel.platformId];
  let unavailableReason: string | null = null;
  if (prefs.fulfillment === "pickup" && !(platform.fees.pickup.supported && channel.pickupAvailable)) {
    unavailableReason = "Pickup not offered for this store on this platform";
  }

  const lines = items.map((item) =>
    matchItem(item, item.productId ? provider.offers(channel, item.productId) : [], prefs),
  );
  const missingCount = lines.filter((l) => l.status === "missing").length;
  const substitutedCount = lines.filter((l) => l.status === "substituted").length;
  const fees = computeFees(channel, lines, prefs);

  return {
    channelId: channel.id,
    platformId: channel.platformId,
    storeId: channel.storeId,
    label: channelLabel(channel),
    lines,
    ...fees,
    missingCount,
    substitutedCount,
    complete: !unavailableReason && missingCount === 0 && lines.length > 0,
    unavailableReason,
  };
}

/**
 * Rank by complete-cart total. Incomplete carts are never ranked above complete
 * ones: a cheaper cart that's missing your eggs isn't actually cheaper.
 */
export function rankQuotes(quotes: CartQuote[]): CartQuote[] {
  const bucket = (q: CartQuote) => (q.unavailableReason ? 2 : q.complete ? 0 : 1);
  return [...quotes].sort(
    (a, b) =>
      bucket(a) - bucket(b) ||
      (bucket(a) === 1 ? a.missingCount - b.missingCount : 0) ||
      a.total - b.total ||
      a.substitutedCount - b.substitutedCount ||
      a.label.localeCompare(b.label),
  );
}

export function compareCarts(items: ListItem[], prefs: Preferences, provider: PriceProvider): CartQuote[] {
  const channels = provider.channels().filter((c) => prefs.stores.includes(c.storeId));
  return rankQuotes(channels.map((c) => quoteChannel(c, items, prefs, provider)));
}
