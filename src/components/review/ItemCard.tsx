"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";
import type { ListItem } from "@/lib/types";
import { getProduct } from "@/lib/data/catalog";
import { useApp } from "@/lib/state/store";
import { QtyStepper } from "../ui/primitives";
import { ProductGlyph } from "../ui/ProductGlyph";
import { Button } from "../ui/Button";

const rowMotion = {
  layout: true,
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.2 },
} as const;

/** One editable row on the Review sheet. */
export function ItemCard({ item }: { item: ListItem }) {
  const { dispatch } = useApp();
  const product = getProduct(item.productId);
  const update = (patch: Partial<ListItem>) => dispatch({ type: "updateItem", id: item.id, patch });
  const confirm = (patch: Partial<ListItem> = {}) => update({ ...patch, review: null, confidence: "high", source: "user" });
  const remove = () => dispatch({ type: "removeItem", id: item.id });

  if (!product) return <UnmatchedRow item={item} onRemove={remove} />;

  const brands = Array.from(new Set(product.offerings.map((o) => o.brand).filter((b) => b !== "STORE" && b !== "Fresh")));

  return (
    <motion.li {...rowMotion} className={`border-b border-line last:border-b-0 ${item.review ? "bg-review-soft/35" : ""}`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <ProductGlyph productId={item.productId} category={item.category} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-tight font-medium text-ink">{item.displayName}</h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted" title={item.rawText}>
              You wrote “{item.rawText}”
            </p>
          </div>
          <QtyStepper value={item.quantity} unit={item.soldBy} label={item.displayName} onChange={(quantity) => update({ quantity })} />
          <button
            onClick={remove}
            aria-label={`Remove ${item.displayName}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-14">
          {product.variants.length > 1 ? (
            <Select
              label="Size or type"
              value={item.variantId ?? product.defaultVariantId}
              onChange={(variantId) => confirm({ variantId })}
              options={product.variants.map((v) => ({ value: v.id, label: v.label }))}
            />
          ) : (
            <span className="inline-flex h-8 items-center rounded-md bg-ink/[0.04] px-2.5 text-[13px] text-ink-2">{product.variants[0].label}</span>
          )}
          {brands.length > 0 && (
            <Select
              label="Brand"
              value={item.brand ?? ""}
              onChange={(b) => update({ brand: b || null })}
              options={[{ value: "", label: "Any brand" }, ...brands.map((b) => ({ value: b, label: b }))]}
            />
          )}
        </div>

        {item.review && (
          <div className="mt-3 ml-14 border-l-2 border-review/50 pl-3">
            <p className="text-[13px] leading-snug text-[#6b4108]">{item.review.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {item.review.options.map((o) => {
                const selected = o.variantId === item.variantId;
                return (
                  <button
                    key={o.variantId}
                    onClick={() => confirm({ variantId: o.variantId })}
                    aria-pressed={selected}
                    className={`inline-flex h-8 items-center gap-1 rounded-sm border px-2.5 text-[13px] transition-colors ${
                      selected ? "border-ink/60 bg-surface font-medium text-ink" : "border-line-strong bg-surface/60 text-ink-2 hover:border-ink/40"
                    }`}
                  >
                    {selected && <Check size={13} className="text-accent" />} {o.label}
                  </button>
                );
              })}
              <button onClick={() => confirm()} className="h-8 px-1.5 text-[13px] font-medium text-accent underline-offset-2 hover:underline">
                {item.review.options.length ? "Keep this" : "Looks right"}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.li>
  );
}

function UnmatchedRow({ item, onRemove }: { item: ListItem; onRemove: () => void }) {
  const { rephrase, state } = useApp();
  const [text, setText] = useState(item.rawText);
  const busy = state.parse.status === "loading";
  return (
    <motion.li {...rowMotion} className="border-b border-line last:border-b-0">
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <ProductGlyph productId={null} category={null} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-tight font-medium text-ink">{item.displayName}</h3>
            <p className="mt-0.5 text-[12.5px] text-danger">Not in our catalog, so it won&apos;t be priced.</p>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Remove ${item.displayName}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>
        <form
          className="mt-2.5 flex gap-2 pl-14"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) rephrase(item.id, text.trim());
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Rephrase item"
            className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 text-[14px] focus:border-ink/50 focus:outline-none"
          />
          <Button size="sm" variant="secondary" type="submit" disabled={busy || !text.trim()} className="h-9">
            Try again
          </Button>
        </form>
      </div>
    </motion.li>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative inline-flex">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 appearance-none rounded-md border border-line-strong bg-surface pr-7 pl-2.5 text-[13px] text-ink hover:border-ink/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted" />
    </label>
  );
}
