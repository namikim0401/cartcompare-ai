# CartCompare

**One cart. Every platform. The best deal.**

Write one grocery list in plain language. CartCompare structures it, lets you correct it, and compares the **complete cart cost** — items, delivery, service fees, tax, promos, and missing items — across DoorDash, Uber Eats and Instacart at Target and Safeway.

> **All prices are simulated demo data.** CartCompare is a portfolio MVP. It does not access live prices from any delivery platform or retailer and is not affiliated with them.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # parser, engine and grounding tests
```

No API key needed: the app runs in clearly labeled **Demo mode** (rule-based parsing, template explanations). To turn on AI, copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. The key is read only in server code (`import "server-only"`).

Deploy: push to GitHub → import in Vercel → optionally add `OPENAI_API_KEY` in Project Settings. No other configuration.

---

## Product decisions

**The core principle: AI understands language; it never touches money.**

| Concern | Who does it | Why |
|---|---|---|
| "a gallon of milk, some bread" → structured items | LLM (or demo parser) | Language is ambiguous; this is what models are good at. |
| Matching items to SKUs, picking cheapest, substitutions | Deterministic engine | Must be explainable and reproducible. |
| Fees, tax, promos, totals, ranking | Deterministic engine | A wrong number destroys trust in a price tool. |
| Explaining the result in a sentence | Template, optionally LLM-phrased | The model may only quote numbers the engine produced — verified server-side. |

Other decisions worth calling out:

1. **Rank complete carts only.** A cart missing your eggs isn't cheaper, it's incomplete. Incomplete carts are shown in a separate "Missing items · not ranked" section with a "turn on substitutions" hint, rather than silently winning.
2. **Suggest, don't assume.** When the request is underspecified ("a gallon of milk" — whole or 2%?), the parser picks a sensible default *and* flags it with the alternatives as one-tap chips. Users can proceed without confirming; the bottom bar says "We'll use our suggestions for 3 unchecked items."
3. **Unrecognized ≠ error.** Items not in the catalog stay visible with a "Try again" rephrase field. They're excluded from pricing (otherwise every cart would be "incomplete") and the CTA says so.
4. **Show the receipt, not just the answer.** Every option expands to a full fee breakdown and per-item lines with status (matched / substituted / missing) and a plain-language reason ("Oatly unavailable — substituted Planet Oat").
5. **Preferences re-rank instantly.** The engine is pure and runs client-side in <1ms, so toggling pickup, stores, brand flexibility or substitutions reorders cards with a layout animation — cause and effect stay visible.
6. **Honest disclosure is persistent, not a footnote.** "Demo prices" appears on both result screens; the header shows Demo mode / AI on; the recommendation says whether its text came from the engine or from AI ("every number checked against the pricing engine").
7. **No checkout.** CartCompare tells you where to buy, not how. It says final prices may differ.

### Interesting result the data produces

For the 5-item "Quick run" sample, DoorDash × Target wins on low fees. For the 12-item "Weekly shop", **Instacart × Safeway** wins even though DoorDash × Target has a lower item subtotal ($60.12 vs $61.24) — Instacart's in-store pricing and reduced delivery fee over $35 outweigh it. The best platform depends on cart size, which is the whole argument for the product.

---

## Information architecture

```
CartCompare (single-page, 4-step flow; stepper allows going back to any reached step)
│
├── 1. List        Natural-language composer · editable/removable entries · sample lists
│                  CTA: Organize my list  (re-organizing warns it will replace reviewed items)
│
├── 2. Review      Structured item cards: name, size/type, brand, qty, category, source text
│                  Confidence flags with one-tap alternatives · unrecognized items w/ rephrase
│                  Add item (parsed) · CTA: Compare N items
│
├── 3. Compare     Preferences (collapsible) · Demo-data disclosure
│                  Ranked complete carts → Incomplete (not ranked) → Not available (e.g. no pickup)
│                  Each card expands to fee breakdown + per-item lines
│
└── 4. Pick        Winner, total, savings · explanation + its provenance
                   Preferences (same control) · cost composition bars · winner's itemized cart
```

## Architecture

```
src/
├── app/
│   ├── page.tsx                  Server component: reads whether a key exists → AppShell
│   ├── api/parse/route.ts        POST text → ListItem[]  (LLM → validate → fallback to demo)
│   └── api/explain/route.ts      POST items+prefs → recomputes quotes server-side → verified text
├── components/
│   ├── AppShell.tsx              Top bar, mode badge, stepper, animated screen switch, BottomBar
│   ├── screens/                  ListScreen · ReviewScreen · CompareScreen · RecommendScreen
│   ├── review/ItemCard.tsx       Item editor, ambiguity chips, unrecognized-item card
│   ├── compare/                  QuoteCard (+FeeBreakdown, LineList) · PreferencesPanel · DemoDataNotice
│   └── ui/                       Button · Badge · Toggle · Segmented · QtyStepper · PlatformMark
└── lib/
    ├── types.ts                  Domain model (money in integer cents)
    ├── data/catalog.ts           Canonical products, variants, aliases, brand base prices
    ├── data/market.ts            Stores, platforms, fee schedules, channels, SKUs, stock
    ├── parsing/
    │   ├── llmParser.ts          server-only; strict JSON schema; catalog IDs in prompt
    │   ├── demoParser.ts         rule-based parser (also the AI fallback)
    │   └── normalize.ts          validates any parser's output against the catalog
    ├── pricing/
    │   ├── provider.ts           PriceProvider interface + MockPriceProvider
    │   └── engine.ts             matchItem · quoteChannel · rankQuotes · compareCarts
    ├── recommend/explain.ts      facts → template text · numeric grounding verifier
    └── state/store.tsx           useReducer + context; derived quotes; localStorage restore
```

### Data model

```
CanonicalProduct  id, name, category, soldBy (each|lb), aliases[], variants[], taxable
  └── Variant     id, label ("2% · 1 gal"), keywords[], count? (for "12 eggs" → 12 ct)
Store             id, name, storeBrand, taxRate
Platform          id, name, fees { delivery, service %, min/max, smallOrder, pickup, promo }
Channel           platform × store, itemMarkup, pickupAvailable
Sku               store, product, variant, brand, isStoreBrand, shelfPrice (cents)

ListItem          rawText, productId|null, variantId, brand|null, quantity, confidence,
                  review { message, options[] } | null, source (ai|demo|user)
Preferences       stores[], brandFlexible, allowSubstitutions, fulfillment
CartQuote         lines[], subtotal, deliveryFee, serviceFee, smallOrderFee, pickupFee,
                  tax, discount, total, missingCount, substitutedCount, complete, unavailableReason
```

**Mock data is generated, not hand-typed.** Each product has realistic base prices per brand/variant. SKUs are derived per store using a store price factor plus a deterministic ±6% hash-based variation, then rounded to shelf-style prices (x.x9). Channel prices apply a platform markup. Name-brand stock-outs are hash-based (~12%) plus a few pinned gaps so substitutions reliably appear. Same input, same output, every time.

### Trust boundary for AI

- **Parsing:** the model sees catalog IDs, never prices, and must reply in a strict JSON schema. `normalize.ts` rejects unknown products/variants/brands and turns them into visible review flags.
- **Explaining:** the client sends the list and preferences, never prices. The server recomputes quotes, builds a facts object of pre-formatted dollar strings, and asks the model to phrase them. `verifyExplanation` rejects any money-like number not in the facts; the template is used instead and the UI says why.
- **Failure:** timeouts (15s), non-200s, or malformed JSON fall back to the demo parser with a notice.

---

## Tradeoffs and what I'd do next

| Chose | Over | Because |
|---|---|---|
| Client-side pricing engine | Server API per preference change | Instant re-ranking is the core interaction; engine is pure and the mock data is small. With live data this moves server-side behind the same `PriceProvider` interface. |
| Single page with step state | Separate routes | Lets the screen transition animate and keeps state simple. Cost: no deep links per step. |
| Closed catalog (≈35 products) | Open-ended product search | Makes matching verifiable. Unknown items are surfaced, not guessed. |
| Template explanation by default | Always-on LLM explanation | It's correct, instant and free; the LLM only rephrases and is verified. |
| Brand flexibility as a global toggle | Per-item brand strictness | Simpler mental model for v1; per-item "must be this brand" is the obvious next step. |
| localStorage for in-progress list | Accounts | No login in v1, per scope. |

**Next:** per-item brand lock · price-per-unit comparisons across sizes · delivery-time estimates as a second ranking axis · membership toggles (DashPass, Uber One, Instacart+) · dark mode · real price feeds behind `PriceProvider` · analytics on which suggestions users correct (to tune the parser).
