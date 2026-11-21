import { describe, expect, it } from "vitest";
import { demoParse } from "./parsing/demoParser";
import { toListItem } from "./parsing/normalize";
import { compareCarts, matchItem } from "./pricing/engine";
import { mockProvider } from "./pricing/provider";
import { buildFacts, templateExplanation, verifyExplanation } from "./recommend/explain";
import { CHANNELS } from "./data/market";
import type { ListItem, Preferences } from "./types";

const SAMPLE = "I need a gallon of milk, 12 eggs, 2 pounds of bananas, oat milk, and some bread.";
const PREFS: Preferences = { stores: ["target", "safeway"], brandFlexible: true, allowSubstitutions: true, fulfillment: "delivery" };
const parse = (t: string) => demoParse(t).map((r) => toListItem(r, "demo"));

describe("demo parser", () => {
  it("parses the sample request into five structured items", () => {
    const items = parse(SAMPLE);
    expect(items.map((i) => i.productId)).toEqual(["milk", "eggs", "bananas", "oat-milk", "bread"]);
    const [milk, eggs, bananas, oat, bread] = items;
    expect(milk.variantId).toMatch(/gal$/);
    expect(milk.review).not.toBeNull(); // whole vs 2% is ambiguous → asks
    expect(eggs).toMatchObject({ variantId: "12ct", quantity: 1, review: null });
    expect(bananas).toMatchObject({ quantity: 2, soldBy: "lb", review: null });
    expect(oat.review).not.toBeNull(); // size not given
    expect(bread.confidence).toBe("low"); // kind not given
  });

  it("handles brands, dozens and unknown items", () => {
    const [oatly, eggs, mystery] = parse("Oatly oat milk, 2 dozen eggs, dragon fruit");
    expect(oatly.brand).toBe("Oatly");
    expect(eggs).toMatchObject({ variantId: "12ct", quantity: 2 });
    expect(mystery.productId).toBeNull();
    expect(mystery.review?.message).toMatch(/demo catalog/);
  });

  it("estimates weight for count-of-produce and says so", () => {
    const [b] = parse("3 bananas");
    expect(b.quantity).toBeCloseTo(1.25);
    expect(b.review?.message).toMatch(/estimated/);
  });
});

describe("pricing engine", () => {
  const items = parse(SAMPLE);

  it("is deterministic", () => {
    expect(compareCarts(items, PREFS, mockProvider)).toEqual(compareCarts(items, PREFS, mockProvider));
  });

  it("totals add up from their parts", () => {
    for (const q of compareCarts(items, PREFS, mockProvider)) {
      expect(q.total).toBe(q.subtotal + q.deliveryFee + q.serviceFee + q.smallOrderFee + q.pickupFee + q.tax - q.discount);
      expect(q.subtotal).toBe(q.lines.reduce((s, l) => s + l.lineTotal, 0));
    }
  });

  it("never ranks an incomplete cart above a complete one", () => {
    const strict: ListItem[] = [...items, { ...items[3], id: "x", brand: "Oatly" }];
    const ranked = compareCarts(strict, { ...PREFS, brandFlexible: false, allowSubstitutions: false }, mockProvider);
    const firstIncomplete = ranked.findIndex((q) => !q.complete);
    const lastComplete = ranked.map((q) => q.complete).lastIndexOf(true);
    if (firstIncomplete !== -1 && lastComplete !== -1) expect(lastComplete).toBeLessThan(firstIncomplete);
  });

  it("marks a strict brand that is out of stock as missing, or substituted when allowed", () => {
    const oatly: ListItem = { ...items[3], brand: "Oatly", variantId: "64oz" };
    const ch = CHANNELS.find((c) => c.id === "ubereats-target")!;
    const offers = mockProvider.offers(ch, "oat-milk");
    expect(matchItem(oatly, offers, { ...PREFS, brandFlexible: false, allowSubstitutions: false }).status).toBe("missing");
    expect(matchItem(oatly, offers, { ...PREFS, brandFlexible: false, allowSubstitutions: true }).status).toBe("substituted");
  });

  it("filters by preferred store and handles pickup availability", () => {
    const targetOnly = compareCarts(items, { ...PREFS, stores: ["target"] }, mockProvider);
    expect(targetOnly.every((q) => q.storeId === "target")).toBe(true);
    const pickup = compareCarts(items, { ...PREFS, fulfillment: "pickup" }, mockProvider);
    expect(pickup.some((q) => q.unavailableReason)).toBe(true);
    expect(pickup.filter((q) => !q.unavailableReason).every((q) => q.deliveryFee === 0)).toBe(true);
  });
});

describe("recommendation grounding", () => {
  const facts = buildFacts(compareCarts(parse(SAMPLE), PREFS, mockProvider));

  it("template only uses engine numbers", () => {
    expect(verifyExplanation(templateExplanation(facts), facts).ok).toBe(true);
  });

  it("rejects text with invented numbers", () => {
    expect(verifyExplanation(`${facts.recommended!.option} is cheapest at $1.23.`, facts).ok).toBe(false);
    expect(verifyExplanation("You save about 30 dollars.", facts).ok).toBe(false);
  });
});

it("prints the sample comparison (for manual sanity check)", () => {
  const ranked = compareCarts(parse(SAMPLE), PREFS, mockProvider);
  const rows = ranked.map((q) =>
    [q.label.padEnd(22), q.subtotal, q.deliveryFee, q.serviceFee, q.smallOrderFee, q.tax, -q.discount, q.total, q.complete ? "" : "INCOMPLETE"].join("\t"),
  );
  console.log(["option\t\t\tsub\tdel\tsvc\tsmall\ttax\tdisc\ttotal", ...rows].join("\n"));
  console.log(templateExplanation(buildFacts(ranked)));
});
