import type { Category } from "@/lib/types";

/**
 * Line-art product illustrations on a category-tinted tile.
 * Drawn on a 24×24 grid with a 1.4 stroke so they read as one family.
 */

type Glyph = keyof typeof PATHS;

const PATHS = {
  carton: (
    <>
      <path d="M8 7.5 9.5 4h5L16 7.5V20H8z" />
      <path d="M8 7.5h8M12 4v3.5" />
      <path d="M10.2 12.2h3.6v3.6h-3.6z" />
    </>
  ),
  egg: (
    <>
      <path d="M12 3.8c3 0 5.5 4.9 5.5 9.2a5.5 5.5 0 0 1-11 0c0-4.3 2.5-9.2 5.5-9.2z" />
      <path d="M9.6 13.8a2.6 2.6 0 0 0 1.6 2.4" />
    </>
  ),
  banana: (
    <>
      <path d="M5 8.5c1.4 6.6 7.4 10 13.6 7.6.6-.2.8-.9.4-1.3-5.2.8-9.6-2.2-11.2-7.2" />
      <path d="M5 8.5 4.2 6.6M7.8 7.6 7.4 6" />
    </>
  ),
  apple: (
    <>
      <path d="M12 8.2c-1.6-1.2-5.8-1.4-6.3 3.2-.4 3.8 2.1 8.3 4.2 8.3.9 0 1.3-.5 2.1-.5s1.2.5 2.1.5c2.1 0 4.6-4.5 4.2-8.3-.5-4.6-4.7-4.4-6.3-3.2z" />
      <path d="M12 8.2c0-1.8.6-3.2 2-4.1" />
    </>
  ),
  avocado: (
    <>
      <path d="M12 3.8c2.4 0 3.6 2.6 4.4 5.6.6 2.2 2 3.6 2 6a6.4 6.4 0 0 1-12.8 0c0-2.4 1.4-3.8 2-6 .8-3 2-5.6 4.4-5.6z" />
      <circle cx="12" cy="15.2" r="2.4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5.5 18.5C5 11 9 5.5 18.5 5.5 18.5 14 13.5 19 5.5 18.5z" />
      <path d="M5.5 18.5 13 11" />
    </>
  ),
  berry: (
    <>
      <path d="M12 8c3.6 0 6 1.4 6 3.8 0 3.6-3.6 8.2-6 8.2s-6-4.6-6-8.2C6 9.4 8.4 8 12 8z" />
      <path d="M9 8 12 5.2 15 8M12 5.2V3.8" />
      <path d="M10 12.5h.01M14 12.5h.01M12 15.5h.01" strokeWidth="2" />
    </>
  ),
  bulb: (
    <>
      <path d="M12 6.5c3.6 1.4 6 4 6 7a6 6 0 0 1-12 0c0-3 2.4-5.6 6-7z" />
      <path d="M12 6.5V3.8M12 20.5c-1-2-1-5 0-8" />
    </>
  ),
  loaf: (
    <>
      <path d="M5 11a4 4 0 0 1 3-6.2h8A4 4 0 0 1 19 11v8.2H5z" />
      <path d="M9 8.8l1.4 1.4M12.2 8.8l1.4 1.4M15.2 8.8l.8.8" />
    </>
  ),
  ring: (
    <>
      <ellipse cx="12" cy="12.5" rx="7.5" ry="6" />
      <ellipse cx="12" cy="12.5" rx="2.6" ry="1.8" />
    </>
  ),
  jar: (
    <>
      <path d="M8.5 4.5h7v2.5h-7z" />
      <path d="M8 7h8c1 1 1.5 2 1.5 3.5V19a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-8.5C6.5 9 7 8 8 7z" />
      <path d="M6.5 12h11v4.5h-11" />
    </>
  ),
  tub: (
    <>
      <path d="M5.5 8h13l-1.4 11.2a1 1 0 0 1-1 .8H7.9a1 1 0 0 1-1-.8z" />
      <path d="M5 8h14V6H5z" />
      <path d="M8.5 12.5h7" />
    </>
  ),
  box: (
    <>
      <path d="M6.5 5h11v15h-11z" />
      <path d="M6.5 8.5h11" />
      <circle cx="12" cy="14" r="2.6" />
    </>
  ),
  sack: (
    <>
      <path d="M8 6.5h8l1.6 3.4c.6 1.4.9 2.8.9 4.3V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-4.8c0-1.5.3-2.9.9-4.3z" />
      <path d="M8 6.5 7 4h10l-1 2.5" />
      <path d="M9.5 13.5h5" />
    </>
  ),
  bottle: (
    <>
      <path d="M10.5 3.8h3V7c1.8.8 2.8 2.4 2.8 4.2V19a1 1 0 0 1-1 1H8.7a1 1 0 0 1-1-1v-7.8c0-1.8 1-3.4 2.8-4.2z" />
      <path d="M7.7 12.5h8.6v4H7.7" />
    </>
  ),
  can: (
    <>
      <path d="M8 5.5h8v14H8z" />
      <path d="M8 8h8M8 17h8M10.5 5.5V4h3v1.5" />
    </>
  ),
  drumstick: (
    <>
      <path d="M14.6 4.4a5 5 0 0 1 4.9 6.6c-.8 2.4-3.4 3.4-5.6 3.4l-3.5 3.5" />
      <path d="M14.6 4.4C11 4.4 8.6 7.6 9.4 11l-3.5 3.6" />
      <circle cx="6.6" cy="17.4" r="1.6" />
      <circle cx="4.9" cy="15.7" r="1.2" />
    </>
  ),
  fish: (
    <>
      <path d="M3.8 12c2.4-3.4 5.6-5 9-5 3.2 0 5.6 2 6.6 5-1 3-3.4 5-6.6 5-3.4 0-6.6-1.6-9-5z" />
      <path d="M19.4 12 21 9v6zM8.5 12h.01" />
    </>
  ),
  slice: (
    <>
      <path d="M4.5 7.5c5-3 10-3 15 0L12 20.5z" />
      <path d="M5.8 9.6c4-2 8.4-2 12.4 0" />
      <circle cx="10.6" cy="12.4" r=".9" />
      <circle cx="13.4" cy="14.8" r=".9" />
    </>
  ),
  cone: (
    <>
      <path d="M8 11 12 20.5 16 11" />
      <path d="M7.5 11a4.5 4.5 0 1 1 9 0z" />
    </>
  ),
  wedge: (
    <>
      <path d="M4 15.5 16.5 7 20 10.5v6H4z" />
      <path d="M4 15.5h16" />
      <circle cx="9.5" cy="18" r=".8" />
      <circle cx="15.5" cy="13" r=".8" />
    </>
  ),
  block: (
    <>
      <path d="M4.5 10 9 7h10.5v7L15 17H4.5z" />
      <path d="M4.5 10H15v7M15 10l4.5-3" />
    </>
  ),
  roll: (
    <>
      <ellipse cx="9" cy="7.5" rx="3.5" ry="2.5" />
      <path d="M5.5 7.5v10c0 1.4 1.6 2.5 3.5 2.5s3.5-1.1 3.5-2.5v-10M12.5 7.5H19v10h-6.5" />
      <ellipse cx="9" cy="7.5" rx="1.2" ry=".8" />
    </>
  ),
  cup: (
    <>
      <path d="M6.5 8.5h9l-1 11h-7z" />
      <path d="M15.5 10.5h1.5a2 2 0 0 1 0 4h-1.9M8 4.5c0 1 1 1 1 2M11 4.5c0 1 1 1 1 2" />
    </>
  ),
  basket: (
    <>
      <path d="M4 10h16l-1.6 9a1 1 0 0 1-1 .8H6.6a1 1 0 0 1-1-.8z" />
      <path d="M8 10l3-5.5M16 10l-3-5.5M9 13.5v3M12 13.5v3M15 13.5v3" />
    </>
  ),
} as const;

const BY_PRODUCT: Record<string, Glyph> = {
  milk: "carton",
  "oat-milk": "carton",
  "almond-milk": "carton",
  "orange-juice": "carton",
  eggs: "egg",
  butter: "block",
  "greek-yogurt": "tub",
  cheddar: "wedge",
  bananas: "banana",
  apples: "apple",
  avocados: "avocado",
  spinach: "leaf",
  strawberries: "berry",
  onions: "bulb",
  potatoes: "bulb",
  tomatoes: "apple",
  lemons: "egg",
  bread: "loaf",
  bagels: "ring",
  pasta: "box",
  "pasta-sauce": "jar",
  rice: "sack",
  "peanut-butter": "jar",
  cereal: "box",
  "olive-oil": "bottle",
  coffee: "sack",
  "chicken-breast": "drumstick",
  "ground-beef": "block",
  salmon: "fish",
  "frozen-pizza": "slice",
  "ice-cream": "cone",
  "frozen-berries": "berry",
  "sparkling-water": "can",
  "paper-towels": "roll",
  "dish-soap": "bottle",
  "trash-bags": "sack",
};

const BY_CATEGORY: Record<Category, { glyph: Glyph; tint: string }> = {
  "Dairy & Eggs": { glyph: "carton", tint: "bg-tint-dairy" },
  Produce: { glyph: "leaf", tint: "bg-tint-produce" },
  Bakery: { glyph: "loaf", tint: "bg-tint-bakery" },
  Pantry: { glyph: "jar", tint: "bg-tint-pantry" },
  "Meat & Seafood": { glyph: "drumstick", tint: "bg-tint-meat" },
  Frozen: { glyph: "cone", tint: "bg-tint-frozen" },
  Beverages: { glyph: "cup", tint: "bg-tint-beverage" },
  Household: { glyph: "roll", tint: "bg-tint-household" },
};

export function ProductGlyph({
  productId,
  category,
  size = 44,
}: {
  productId: string | null;
  category: Category | null;
  size?: number;
}) {
  const cat = category ? BY_CATEGORY[category] : null;
  const glyph: Glyph = (productId && BY_PRODUCT[productId]) || cat?.glyph || "basket";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-md ${cat?.tint ?? "bg-ink/[0.05]"}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.58}
        height={size * 0.58}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink/80"
      >
        {PATHS[glyph]}
      </svg>
    </span>
  );
}
