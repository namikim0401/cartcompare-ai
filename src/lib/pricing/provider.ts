import type { Channel, Cents, Sku } from "../types";
import { CHANNELS, SKUS, isInStock } from "../data/market";

/** A SKU as sold on one channel (platform × store), at that channel's price. */
export interface Offer {
  sku: Sku;
  price: Cents;
  inStock: boolean;
}

/**
 * The only thing the pricing engine knows about where prices come from.
 * Today: MockPriceProvider. Later: a partner API, a scraper service, or a
 * cached price index could implement the same two methods.
 */
export interface PriceProvider {
  readonly isMock: boolean;
  channels(): Channel[];
  offers(channel: Channel, productId: string): Offer[];
}

export class MockPriceProvider implements PriceProvider {
  readonly isMock = true;
  private byStoreProduct = new Map<string, Sku[]>();

  constructor() {
    for (const sku of SKUS) {
      const key = `${sku.storeId}:${sku.productId}`;
      const list = this.byStoreProduct.get(key) ?? [];
      list.push(sku);
      this.byStoreProduct.set(key, list);
    }
  }

  channels(): Channel[] {
    return CHANNELS;
  }

  offers(channel: Channel, productId: string): Offer[] {
    const skus = this.byStoreProduct.get(`${channel.storeId}:${productId}`) ?? [];
    return skus.map((sku) => ({
      sku,
      price: Math.round(sku.shelfPrice * channel.itemMarkup),
      inStock: isInStock(channel.id, sku),
    }));
  }
}

export const mockProvider = new MockPriceProvider();
