import type { Channel, Platform, PlatformId, Sku, Store, StoreId } from "../types";
import { CATALOG } from "./catalog";

/**
 * MOCK market data: stores, platforms, fee schedules, markups and stock.
 * Fee structures are modeled on how these platforms publicly describe their fees
 * (delivery fee, % service fee with a minimum, small-order fee, occasional promos),
 * but every number here is invented for the demo. None of it is live data.
 */

export const STORES: Record<StoreId, Store> = {
  target: { id: "target", name: "Target", storeBrand: "Good & Gather", taxRate: 0.0925 },
  safeway: { id: "safeway", name: "Safeway", storeBrand: "Signature Select", taxRate: 0.0925 },
};

export const PLATFORMS: Record<PlatformId, Platform> = {
  doordash: {
    id: "doordash",
    name: "DoorDash",
    fees: {
      delivery: { base: 399, reducedOver: { threshold: 3500, fee: 199 } },
      service: { rate: 0.12, min: 299 },
      smallOrder: { threshold: 1200, fee: 250 },
      pickup: { supported: true, fee: 0, serviceRate: 0 },
    },
  },
  ubereats: {
    id: "ubereats",
    name: "Uber Eats",
    fees: {
      delivery: { base: 499 },
      service: { rate: 0.15, min: 300 },
      smallOrder: { threshold: 1500, fee: 300 },
      pickup: { supported: true, fee: 0, serviceRate: 0 },
      promo: { label: "$6 off orders over $40 (demo promo)", threshold: 4000, amount: 600 },
    },
  },
  instacart: {
    id: "instacart",
    name: "Instacart",
    fees: {
      delivery: { base: 599, reducedOver: { threshold: 3500, fee: 399 } },
      service: { rate: 0.05, min: 199, max: 1500 },
      smallOrder: { threshold: 1000, fee: 200 },
      pickup: { supported: true, fee: 199, serviceRate: 0 },
    },
  },
};

export const CHANNELS: Channel[] = [
  { id: "doordash-target", platformId: "doordash", storeId: "target", itemMarkup: 1.08, pickupAvailable: true },
  { id: "ubereats-target", platformId: "ubereats", storeId: "target", itemMarkup: 1.11, pickupAvailable: false },
  { id: "instacart-target", platformId: "instacart", storeId: "target", itemMarkup: 1.12, pickupAvailable: true },
  { id: "doordash-safeway", platformId: "doordash", storeId: "safeway", itemMarkup: 1.06, pickupAvailable: false },
  { id: "ubereats-safeway", platformId: "ubereats", storeId: "safeway", itemMarkup: 1.08, pickupAvailable: true },
  { id: "instacart-safeway", platformId: "instacart", storeId: "safeway", itemMarkup: 1.0, pickupAvailable: true },
];

export function channelLabel(c: Pick<Channel, "platformId" | "storeId">): string {
  return `${PLATFORMS[c.platformId].name} × ${STORES[c.storeId].name}`;
}

/* ------------------------------ Deterministic noise ------------------------------ */

/** FNV-1a hash → [0, 1). Same input always gives the same output. */
export function hash01(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

/** Round to a shelf-style price ending in 9 (e.g. 4.29, 5.49). */
function toShelfCents(dollars: number): number {
  const cents = Math.round(dollars * 100);
  return Math.max(9, Math.round((cents - 9) / 10) * 10 + 9);
}

/** Store-level price positioning. Safeway shelf prices run a bit higher than Target. */
const STORE_FACTOR: Record<StoreId, number> = { target: 0.97, safeway: 1.07 };

/** Products a store simply doesn't carry in this demo (brand × store). */
const NOT_CARRIED: Record<StoreId, string[]> = {
  target: ["Clover Sonoma", "Boudin", "Organic Prairie", "Peet's"],
  safeway: ["Califia Farms", "Vital Farms"],
};

function buildSkus(): Sku[] {
  const skus: Sku[] = [];
  for (const store of Object.values(STORES)) {
    for (const p of CATALOG) {
      for (const offering of p.offerings) {
        if (NOT_CARRIED[store.id].includes(offering.brand)) continue;
        const isStoreBrand = offering.brand === "STORE";
        const brand = isStoreBrand ? store.storeBrand : offering.brand;
        for (const [variantId, base] of Object.entries(offering.prices)) {
          const id = `${store.id}:${p.id}:${variantId}:${brand}`;
          // ±6% per-SKU variation so stores aren't uniformly cheaper.
          const jitter = 0.94 + hash01(id) * 0.12;
          skus.push({
            id,
            storeId: store.id,
            productId: p.id,
            variantId,
            brand,
            isStoreBrand,
            shelfPrice: toShelfCents(base * STORE_FACTOR[store.id] * jitter),
          });
        }
      }
    }
  }
  return skus;
}

export const SKUS: Sku[] = buildSkus();

/**
 * Out-of-stock on a given channel. Store brands and fresh produce are always in
 * stock in the demo; name brands are out ~12% of the time, deterministically.
 * A few hand-picked gaps guarantee the substitution UX shows up in demos.
 */
const FORCED_OUT: Record<string, string[]> = {
  "ubereats-target": ["target:oat-milk:64oz:Oatly"],
  "doordash-safeway": ["safeway:eggs:18ct:Signature Select"],
  "instacart-target": ["target:bread:sourdough:Good & Gather"],
};

export function isInStock(channelId: string, sku: Sku): boolean {
  if (FORCED_OUT[channelId]?.includes(sku.id)) return false;
  if (sku.isStoreBrand || sku.brand === "Fresh") return true;
  return hash01(`${channelId}|${sku.id}`) > 0.12;
}
