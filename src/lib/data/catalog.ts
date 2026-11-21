import type { CanonicalProduct, Category, SoldBy, Variant } from "../types";

/**
 * Demo catalog. Base prices are realistic US grocery prices (2025–26, Bay Area-ish)
 * and are turned into per-store SKUs in `skus.ts`. Everything here is MOCK DATA.
 */

interface Offering {
  brand: string | "STORE";
  /** Base shelf price in dollars per variant. Missing key = brand doesn't make that variant. */
  prices: Record<string, number>;
}

export interface CatalogEntry extends CanonicalProduct {
  offerings: Offering[];
}

const v = (id: string, label: string, keywords: string[] = [], count?: number): Variant => ({
  id,
  label,
  keywords,
  count,
});

function product(
  id: string,
  name: string,
  category: Category,
  aliases: string[],
  variants: Variant[],
  offerings: Offering[],
  opts: { soldBy?: SoldBy; taxable?: boolean; defaultVariantId?: string } = {},
): CatalogEntry {
  return {
    id,
    name,
    category,
    aliases,
    variants,
    offerings,
    soldBy: opts.soldBy ?? "each",
    taxable: opts.taxable ?? false,
    defaultVariantId: opts.defaultVariantId ?? variants[0].id,
  };
}

export const CATALOG: CatalogEntry[] = [
  /* ------------------------------ Dairy & Eggs ------------------------------ */
  product(
    "milk",
    "Milk",
    "Dairy & Eggs",
    ["milk", "whole milk", "2% milk", "skim milk", "dairy milk"],
    [
      v("whole-gal", "Whole · 1 gal", ["whole", "gallon", "gal"]),
      v("2pct-gal", "2% · 1 gal", ["2%", "2 percent", "reduced fat", "gallon", "gal"]),
      v("whole-half", "Whole · ½ gal", ["whole", "half gallon", "half-gallon", "1/2 gal"]),
      v("2pct-half", "2% · ½ gal", ["2%", "2 percent", "reduced fat", "half gallon", "half-gallon", "1/2 gal"]),
    ],
    [
      { brand: "STORE", prices: { "whole-gal": 4.29, "2pct-gal": 4.29, "whole-half": 2.79, "2pct-half": 2.79 } },
      { brand: "Horizon Organic", prices: { "whole-gal": 7.99, "2pct-gal": 7.99, "whole-half": 5.49, "2pct-half": 5.49 } },
      { brand: "Clover Sonoma", prices: { "whole-gal": 6.99, "whole-half": 4.49, "2pct-half": 4.49 } },
    ],
  ),
  product(
    "oat-milk",
    "Oat milk",
    "Dairy & Eggs",
    ["oat milk", "oatmilk", "oat beverage"],
    [v("64oz", "64 fl oz", ["64", "half gallon", "large"]), v("32oz", "32 fl oz", ["32", "quart", "small"])],
    [
      { brand: "Oatly", prices: { "64oz": 5.79, "32oz": 3.99 } },
      { brand: "Califia Farms", prices: { "64oz": 5.49 } },
      { brand: "Planet Oat", prices: { "64oz": 4.29, "32oz": 2.99 } },
    ],
  ),
  product(
    "almond-milk",
    "Almond milk",
    "Dairy & Eggs",
    ["almond milk", "almondmilk"],
    [v("64oz", "Unsweetened · 64 fl oz", ["64", "unsweetened"])],
    [
      { brand: "STORE", prices: { "64oz": 2.99 } },
      { brand: "Califia Farms", prices: { "64oz": 4.99 } },
      { brand: "Blue Diamond", prices: { "64oz": 3.79 } },
    ],
  ),
  product(
    "eggs",
    "Eggs",
    "Dairy & Eggs",
    ["eggs", "egg", "large eggs", "dozen eggs"],
    [v("12ct", "Large · 12 ct", ["dozen", "12"], 12), v("18ct", "Large · 18 ct", ["18"], 18)],
    [
      { brand: "STORE", prices: { "12ct": 3.99, "18ct": 5.79 } },
      { brand: "Vital Farms", prices: { "12ct": 7.49 } },
      { brand: "Eggland's Best", prices: { "12ct": 5.29, "18ct": 7.49 } },
    ],
  ),
  product(
    "butter",
    "Butter",
    "Dairy & Eggs",
    ["butter", "salted butter", "unsalted butter"],
    [v("16oz", "Salted · 16 oz", ["salted", "1 lb", "pound"]), v("16oz-unsalted", "Unsalted · 16 oz", ["unsalted"])],
    [
      { brand: "STORE", prices: { "16oz": 4.49, "16oz-unsalted": 4.49 } },
      { brand: "Kerrygold", prices: { "16oz": 7.99, "16oz-unsalted": 7.99 } },
      { brand: "Tillamook", prices: { "16oz": 6.49 } },
    ],
  ),
  product(
    "greek-yogurt",
    "Greek yogurt",
    "Dairy & Eggs",
    ["greek yogurt", "yogurt", "yoghurt"],
    [v("32oz", "Plain · 32 oz", ["32", "plain", "large"])],
    [
      { brand: "STORE", prices: { "32oz": 4.29 } },
      { brand: "Fage", prices: { "32oz": 6.99 } },
      { brand: "Chobani", prices: { "32oz": 5.99 } },
    ],
  ),
  product(
    "cheddar",
    "Cheddar cheese",
    "Dairy & Eggs",
    ["cheddar", "cheddar cheese", "cheese", "shredded cheese"],
    [v("8oz-block", "Sharp block · 8 oz", ["block", "sharp"]), v("8oz-shred", "Shredded · 8 oz", ["shredded", "shred"])],
    [
      { brand: "STORE", prices: { "8oz-block": 2.99, "8oz-shred": 2.99 } },
      { brand: "Tillamook", prices: { "8oz-block": 4.79, "8oz-shred": 4.79 } },
    ],
  ),

  /* -------------------------------- Produce -------------------------------- */
  product("bananas", "Bananas", "Produce", ["banana", "bananas"], [v("lb", "Per lb", [])], [{ brand: "Fresh", prices: { lb: 0.69 } }], {
    soldBy: "lb",
  }),
  product(
    "apples",
    "Honeycrisp apples",
    "Produce",
    ["apple", "apples", "honeycrisp"],
    [v("lb", "Per lb", [])],
    [{ brand: "Fresh", prices: { lb: 2.99 } }],
    { soldBy: "lb" },
  ),
  product(
    "avocados",
    "Avocados",
    "Produce",
    ["avocado", "avocados"],
    [v("each", "Hass · each", ["each", "single"]), v("bag4", "Hass · 4 ct bag", ["bag", "4 pack", "4 ct"], 4)],
    [{ brand: "Fresh", prices: { each: 1.49, bag4: 4.99 } }],
  ),
  product(
    "spinach",
    "Baby spinach",
    "Produce",
    ["spinach", "baby spinach"],
    [v("5oz", "5 oz clamshell", ["5 oz", "small"]), v("16oz", "16 oz clamshell", ["16 oz", "large", "big"])],
    [
      { brand: "STORE", prices: { "5oz": 2.99, "16oz": 5.49 } },
      { brand: "Organic Girl", prices: { "5oz": 4.29 } },
    ],
  ),
  product(
    "strawberries",
    "Strawberries",
    "Produce",
    ["strawberry", "strawberries"],
    [v("16oz", "16 oz", ["1 lb", "pound"])],
    [{ brand: "Driscoll's", prices: { "16oz": 4.99 } }],
  ),
  product("onions", "Yellow onions", "Produce", ["onion", "onions", "yellow onion"], [v("3lb", "3 lb bag", ["bag", "3 lb"])], [
    { brand: "Fresh", prices: { "3lb": 3.49 } },
  ]),
  product(
    "tomatoes",
    "Roma tomatoes",
    "Produce",
    ["tomato", "tomatoes", "roma tomatoes"],
    [v("lb", "Per lb", [])],
    [{ brand: "Fresh", prices: { lb: 1.79 } }],
    { soldBy: "lb" },
  ),
  product("lemons", "Lemons", "Produce", ["lemon", "lemons"], [v("each", "Each", [])], [{ brand: "Fresh", prices: { each: 0.79 } }]),
  product(
    "potatoes",
    "Russet potatoes",
    "Produce",
    ["potato", "potatoes", "russet potatoes"],
    [v("5lb", "5 lb bag", ["bag", "5 lb"])],
    [{ brand: "Fresh", prices: { "5lb": 4.49 } }],
  ),

  /* -------------------------------- Bakery -------------------------------- */
  product(
    "bread",
    "Bread",
    "Bakery",
    ["bread", "loaf", "sandwich bread", "sourdough", "whole wheat bread", "white bread"],
    [
      v("white", "White sandwich · 20 oz", ["white", "sandwich"]),
      v("wheat", "Whole wheat · 24 oz", ["wheat", "whole wheat", "whole grain", "multigrain"]),
      v("sourdough", "Sourdough · 24 oz", ["sourdough"]),
    ],
    [
      { brand: "STORE", prices: { white: 2.49, wheat: 2.99, sourdough: 3.99 } },
      { brand: "Dave's Killer Bread", prices: { wheat: 6.49 } },
      { brand: "Nature's Own", prices: { white: 3.79, wheat: 3.99 } },
      { brand: "Boudin", prices: { sourdough: 5.99 } },
    ],
  ),
  product("bagels", "Bagels", "Bakery", ["bagel", "bagels"], [v("6ct", "Plain · 6 ct", ["plain", "6"])], [
    { brand: "STORE", prices: { "6ct": 3.49 } },
    { brand: "Thomas'", prices: { "6ct": 4.99 } },
  ]),

  /* -------------------------------- Pantry -------------------------------- */
  product("pasta", "Spaghetti", "Pantry", ["pasta", "spaghetti", "noodles"], [v("16oz", "16 oz", ["1 lb", "box"])], [
    { brand: "STORE", prices: { "16oz": 1.29 } },
    { brand: "Barilla", prices: { "16oz": 2.19 } },
    { brand: "De Cecco", prices: { "16oz": 3.29 } },
  ]),
  product("pasta-sauce", "Marinara sauce", "Pantry", ["pasta sauce", "marinara", "tomato sauce", "red sauce"], [v("24oz", "24 oz jar", ["jar"])], [
    { brand: "STORE", prices: { "24oz": 2.49 } },
    { brand: "Rao's", prices: { "24oz": 8.99 } },
    { brand: "Prego", prices: { "24oz": 3.49 } },
  ]),
  product("rice", "Jasmine rice", "Pantry", ["rice", "jasmine rice", "white rice"], [v("2lb", "2 lb bag", ["2 lb", "bag"])], [
    { brand: "STORE", prices: { "2lb": 3.49 } },
    { brand: "Mahatma", prices: { "2lb": 4.29 } },
  ]),
  product(
    "peanut-butter",
    "Peanut butter",
    "Pantry",
    ["peanut butter", "pb"],
    [v("16oz", "Creamy · 16 oz", ["creamy", "smooth"]), v("16oz-crunchy", "Crunchy · 16 oz", ["crunchy", "chunky"])],
    [
      { brand: "STORE", prices: { "16oz": 2.29, "16oz-crunchy": 2.29 } },
      { brand: "Jif", prices: { "16oz": 3.49, "16oz-crunchy": 3.49 } },
      { brand: "Skippy", prices: { "16oz": 3.29 } },
    ],
  ),
  product("cereal", "Cereal", "Pantry", ["cereal", "cheerios"], [v("12oz", "Toasted oats · 12 oz", ["oats", "toasted"])], [
    { brand: "STORE", prices: { "12oz": 2.99 } },
    { brand: "Cheerios", prices: { "12oz": 4.99 } },
  ]),
  product("olive-oil", "Olive oil", "Pantry", ["olive oil", "evoo", "extra virgin olive oil"], [v("500ml", "Extra virgin · 500 ml", [])], [
    { brand: "STORE", prices: { "500ml": 6.99 } },
    { brand: "California Olive Ranch", prices: { "500ml": 9.99 } },
  ]),
  product("coffee", "Ground coffee", "Pantry", ["coffee", "ground coffee", "coffee beans"], [v("12oz", "Medium roast · 12 oz", ["medium"])], [
    { brand: "STORE", prices: { "12oz": 6.99 } },
    { brand: "Peet's", prices: { "12oz": 10.99 } },
    { brand: "Starbucks", prices: { "12oz": 10.49 } },
  ]),

  /* ----------------------------- Meat & Seafood ----------------------------- */
  product(
    "chicken-breast",
    "Chicken breast",
    "Meat & Seafood",
    ["chicken", "chicken breast", "chicken breasts"],
    [v("lb", "Boneless skinless · per lb", [])],
    [
      { brand: "STORE", prices: { lb: 4.49 } },
      { brand: "Foster Farms", prices: { lb: 5.29 } },
    ],
    { soldBy: "lb" },
  ),
  product("ground-beef", "Ground beef", "Meat & Seafood", ["ground beef", "beef", "hamburger meat"], [v("1lb", "85/15 · 1 lb", ["85", "1 lb"])], [
    { brand: "STORE", prices: { "1lb": 5.99 } },
    { brand: "Organic Prairie", prices: { "1lb": 8.99 } },
  ]),
  product("salmon", "Salmon fillet", "Meat & Seafood", ["salmon", "salmon fillet"], [v("lb", "Atlantic · per lb", [])], [
    { brand: "Fresh", prices: { lb: 11.99 } },
  ], { soldBy: "lb" }),

  /* -------------------------------- Frozen -------------------------------- */
  product("frozen-pizza", "Frozen pizza", "Frozen", ["frozen pizza", "pizza"], [v("each", "Pepperoni · 12 in", ["pepperoni"])], [
    { brand: "STORE", prices: { each: 4.99 } },
    { brand: "DiGiorno", prices: { each: 7.49 } },
  ]),
  product("ice-cream", "Ice cream", "Frozen", ["ice cream"], [v("1.5qt", "Vanilla · 1.5 qt", ["vanilla"])], [
    { brand: "STORE", prices: { "1.5qt": 3.99 } },
    { brand: "Tillamook", prices: { "1.5qt": 6.49 } },
  ]),
  product("frozen-berries", "Frozen berries", "Frozen", ["frozen berries", "frozen fruit"], [v("32oz", "Mixed · 32 oz", ["mixed"])], [
    { brand: "STORE", prices: { "32oz": 8.99 } },
  ]),

  /* ------------------------------- Beverages ------------------------------- */
  product("sparkling-water", "Sparkling water", "Beverages", ["sparkling water", "seltzer", "lacroix", "soda water"], [v("8pk", "8 × 12 fl oz", ["8 pack", "8pk"])], [
    { brand: "STORE", prices: { "8pk": 3.49 } },
    { brand: "LaCroix", prices: { "8pk": 5.29 } },
  ]),
  product("orange-juice", "Orange juice", "Beverages", ["orange juice", "oj"], [v("52oz", "No pulp · 52 fl oz", ["no pulp", "52"])], [
    { brand: "STORE", prices: { "52oz": 3.79 } },
    { brand: "Tropicana", prices: { "52oz": 5.49 } },
  ]),

  /* ------------------------------- Household ------------------------------- */
  product("paper-towels", "Paper towels", "Household", ["paper towels", "paper towel"], [v("6roll", "6 double rolls", ["6"])], [
    { brand: "STORE", prices: { "6roll": 8.99 } },
    { brand: "Bounty", prices: { "6roll": 12.99 } },
  ], { taxable: true }),
  product("dish-soap", "Dish soap", "Household", ["dish soap", "dishwashing liquid"], [v("19oz", "19.4 fl oz", [])], [
    { brand: "STORE", prices: { "19oz": 2.49 } },
    { brand: "Dawn", prices: { "19oz": 3.99 } },
  ], { taxable: true }),
  product("trash-bags", "Trash bags", "Household", ["trash bags", "garbage bags"], [v("13gal", "13 gal · 40 ct", [])], [
    { brand: "STORE", prices: { "13gal": 7.99 } },
    { brand: "Glad", prices: { "13gal": 11.99 } },
  ], { taxable: true }),
];

export const PRODUCTS_BY_ID: Record<string, CatalogEntry> = Object.fromEntries(CATALOG.map((p) => [p.id, p]));

export function getProduct(id: string | null | undefined): CatalogEntry | undefined {
  return id ? PRODUCTS_BY_ID[id] : undefined;
}

export function getVariant(productId: string | null, variantId: string | null): Variant | undefined {
  return getProduct(productId)?.variants.find((x) => x.id === variantId);
}

/** Every named (non-store, non-produce) brand, for brand detection in text. */
export const KNOWN_BRANDS: string[] = Array.from(
  new Set(CATALOG.flatMap((p) => p.offerings.map((o) => o.brand)).filter((b) => b !== "STORE" && b !== "Fresh")),
);
