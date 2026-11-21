"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CornerDownLeft, Plus, X, RotateCw } from "lucide-react";
import { useApp } from "@/lib/state/store";
import { getVariant } from "@/lib/data/catalog";
import type { ListItem } from "@/lib/types";
import { Button } from "../ui/Button";
import { QtyStepper, ScreenHeader, SectionLabel } from "../ui/primitives";
import { ProductGlyph } from "../ui/ProductGlyph";
import { BottomBar, useAiEnabled } from "../AppShell";

const SAMPLES = [
  { label: "Quick run", count: 5, text: "I need a gallon of milk, 12 eggs, 2 pounds of bananas, oat milk, and some bread." },
  {
    label: "Weekly shop",
    count: 12,
    text: "Oatly oat milk, 2 dozen eggs, a gallon of 2% milk, 3 lbs bananas, whole wheat bread, 2 lbs chicken breast, Barilla spaghetti, Rao's marinara, greek yogurt, baby spinach, coffee, paper towels",
  },
];

const STAPLES: { label: string; text: string; productId: string }[] = [
  { label: "Milk", text: "a gallon of milk", productId: "milk" },
  { label: "Eggs", text: "a dozen eggs", productId: "eggs" },
  { label: "Bananas", text: "2 lbs bananas", productId: "bananas" },
  { label: "Bread", text: "bread", productId: "bread" },
  { label: "Avocados", text: "4 avocados", productId: "avocados" },
  { label: "Coffee", text: "coffee", productId: "coffee" },
  { label: "Chicken", text: "1 lb chicken breast", productId: "chicken-breast" },
  { label: "Spinach", text: "baby spinach", productId: "spinach" },
];

interface Pending {
  key: number;
  text: string;
  failed: boolean;
}

export function ListScreen() {
  const { state, dispatch, priceable, addFromText } = useApp();
  const ai = useAiEnabled();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const nextKey = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = state.items;
  const flagged = items.filter((i) => i.review && i.productId).length;
  const unrecognized = items.length - priceable.length;
  const isEmpty = items.length === 0 && pending.length === 0;
  const busy = pending.some((p) => !p.failed);

  const add = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    const key = nextKey.current++;
    setPending((p) => [...p, { key, text: t, failed: false }]);
    const ok = await addFromText(t);
    setPending((p) => (ok ? p.filter((x) => x.key !== key) : p.map((x) => (x.key === key ? { ...x, failed: true } : x))));
  };

  const retry = (p: Pending) => {
    setPending((list) => list.filter((x) => x.key !== p.key));
    add(p.text);
  };

  const compare = () => dispatch({ type: "goto", step: flagged > 0 || unrecognized > 0 ? "review" : "compare" });

  const onList = new Set(items.map((i) => i.productId));
  const staples = STAPLES.filter((s) => !onList.has(s.productId));

  const hint =
    flagged > 0
      ? `${flagged} item${flagged > 1 ? "s" : ""} need${flagged === 1 ? "s" : ""} a quick check first`
      : unrecognized > 0
        ? `${unrecognized} item${unrecognized > 1 ? "s" : ""} not found — we'll skip ${unrecognized > 1 ? "them" : "it"}`
        : priceable.length > 0
          ? "Prices include delivery, service fees, tax and promos"
          : undefined;

  return (
    <div>
      <ScreenHeader
        eyebrow="Grocery delivery, compared"
        title={
          <>
            Build your cart once.
            <br />
            <em className="text-accent">We&apos;ll find where it costs least.</em>
          </>
        }
        subtitle={
          isEmpty
            ? "Add groceries the way you'd text them. We price the whole cart on DoorDash, Uber Eats and Instacart — fees included."
            : undefined
        }
      />

      {/* Entry bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
          setDraft("");
          inputRef.current?.focus();
        }}
        className="group relative animate-rise"
      >
        <label htmlFor="entry" className="sr-only">
          Add groceries
        </label>
        <Plus size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="entry"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Add groceries, e.g. oat milk"
          className="h-[52px] w-full rounded-md border border-line-strong bg-surface pr-24 pl-11 text-[16px] text-ink shadow-[0_1px_0_rgba(28,27,24,0.04)] transition-colors placeholder:text-muted/80 focus:border-ink/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="absolute top-1/2 right-1.5 inline-flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-[7px] bg-ink px-3.5 text-[13.5px] font-medium text-white transition-opacity disabled:opacity-0"
        >
          Add <CornerDownLeft size={13} className="opacity-60" />
        </button>
      </form>
      <p className="mt-2 flex items-center justify-between gap-3 text-[12px] text-muted">
        <span>Type one item or paste a whole list</span>
        <span className="inline-flex shrink-0 items-center gap-1.5" title={ai ? "Items are matched with AI" : "No API key: rule-based matching"}>
          <span className={`h-1.5 w-1.5 rounded-full ${ai ? "bg-accent" : "bg-review"}`} />
          {ai ? "Smart matching" : "Demo matching"}
        </span>
      </p>

      {/* One-tap staples */}
      {staples.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Quick add staples">
          {staples.map((s) => (
            <button
              key={s.productId}
              onClick={() => add(s.text)}
              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-sm border border-line bg-paper px-2.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              <Plus size={12} className="text-muted" /> {s.label}
            </button>
          ))}
        </div>
      )}

      {/* The list */}
      <section className="mt-8" aria-label="Your shopping list">
        <SectionLabel
          aside={
            items.length > 0 ? (
              <span className="inline-flex items-center gap-3">
                <span>
                  {items.length} item{items.length === 1 ? "" : "s"}
                </span>
                <button onClick={() => dispatch({ type: "clearItems" })} className="underline-offset-2 hover:text-ink hover:underline">
                  Clear
                </button>
              </span>
            ) : undefined
          }
        >
          Your list
        </SectionLabel>

        {isEmpty ? (
          <EmptyList onSample={(t) => add(t)} />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-line bg-surface">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <ListRow key={item.id} item={item} />
              ))}
              {pending.map((p) => (
                <PendingRow key={`p${p.key}`} pending={p} onRetry={() => retry(p)} onDismiss={() => setPending((l) => l.filter((x) => x.key !== p.key))} />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {state.parse.notice && !isEmpty && <p className="mt-2 text-[12.5px] text-review">{state.parse.notice}</p>}
      </section>

      {isEmpty && <HowItWorks />}

      <BottomBar hint={hint}>
        <Button size="lg" onClick={compare} disabled={priceable.length === 0 || busy}>
          Compare cart prices
          {priceable.length > 0 && <span className="tabular rounded-sm bg-white/15 px-1.5 text-[12.5px]">{priceable.length}</span>}
          <ArrowRight size={16} />
        </Button>
      </BottomBar>
    </div>
  );
}

/* ---------------------------------- Rows ---------------------------------- */

const rowMotion = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] as const },
};

function ListRow({ item }: { item: ListItem }) {
  const { dispatch, rephrase } = useApp();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.rawText);
  const variant = getVariant(item.productId, item.variantId);
  const recognized = !!item.productId;

  const meta = recognized ? [variant?.label, item.brand].filter(Boolean).join(" · ") : "Not in our catalog — tap to rephrase";

  return (
    <motion.li {...rowMotion} className="border-b border-line last:border-b-0">
      {editing ? (
        <form
          className="flex items-center gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (t && t !== item.rawText) rephrase(item.id, t);
            setEditing(false);
          }}
        >
          <ProductGlyph productId={item.productId} category={item.category} />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
            aria-label={`Edit ${item.displayName}`}
            className="h-10 min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 text-[15px] focus:border-ink/50 focus:outline-none"
          />
          <Button size="sm" type="submit" className="h-10">
            Save
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-3 py-3 pr-2 pl-3">
          <ProductGlyph productId={item.productId} category={item.category} />
          <button
            onClick={() => {
              setText(item.rawText);
              setEditing(true);
            }}
            className="min-w-0 flex-1 text-left"
            aria-label={`Edit ${item.displayName}`}
          >
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-medium text-ink">{item.displayName}</span>
              {item.review && recognized && (
                <span className="shrink-0 rounded-sm bg-review-soft px-1.5 text-[11px] leading-[18px] font-medium text-review">Check</span>
              )}
            </span>
            <span className={`block truncate text-[12.5px] ${recognized ? "text-muted" : "text-danger"}`}>{meta}</span>
          </button>
          {recognized && (
            <QtyStepper value={item.quantity} unit={item.soldBy} label={item.displayName} onChange={(quantity) => dispatch({ type: "updateItem", id: item.id, patch: { quantity } })} />
          )}
          <button
            onClick={() => dispatch({ type: "removeItem", id: item.id })}
            aria-label={`Remove ${item.displayName}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </motion.li>
  );
}

function PendingRow({ pending, onRetry, onDismiss }: { pending: Pending; onRetry: () => void; onDismiss: () => void }) {
  return (
    <motion.li {...rowMotion} className="border-b border-line last:border-b-0" aria-live="polite">
      <div className="flex items-center gap-3 py-3 pr-2 pl-3">
        <span className={`h-11 w-11 shrink-0 rounded-md ${pending.failed ? "bg-danger-soft" : "skeleton"}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] text-ink-2">“{pending.text}”</p>
          <p className={`text-[12.5px] ${pending.failed ? "text-danger" : "text-muted"}`}>
            {pending.failed ? "Couldn't add this — check your connection" : "Matching to products…"}
          </p>
        </div>
        {pending.failed && (
          <>
            <button onClick={onRetry} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-ink hover:bg-ink/[0.05]">
              <RotateCw size={13} /> Retry
            </button>
            <button onClick={onDismiss} aria-label="Dismiss" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:text-ink">
              <X size={16} />
            </button>
          </>
        )}
      </div>
    </motion.li>
  );
}

/* --------------------------------- Empty ---------------------------------- */

function EmptyList({ onSample }: { onSample: (text: string) => void }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-paper/60 px-4 py-5">
      <p className="display text-[22px] leading-tight text-ink">Nothing on the list yet.</p>
      <p className="mt-1 text-[13.5px] text-ink-2">Add a few things above, or start from a sample basket:</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.label}
            onClick={() => onSample(s.text)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-[13.5px] font-medium text-ink transition-colors hover:border-ink/40"
          >
            {s.label} <span className="text-[12px] font-normal text-muted">{s.count} items</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    ["List it", "Type groceries like you'd text them."],
    ["Check it", "We match products and flag anything unclear."],
    ["Compare it", "Full carts, fees and promos included."],
  ];
  return (
    <ol className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-4">
      {steps.map(([title, body], i) => (
        <li key={title}>
          <span className="display text-[22px] leading-none text-accent">{i + 1}</span>
          <p className="mt-1.5 text-[13px] font-medium text-ink">{title}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{body}</p>
        </li>
      ))}
    </ol>
  );
}
