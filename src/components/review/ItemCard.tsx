"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, HelpCircle, SearchX, Trash2, ChevronDown } from "lucide-react";
import type { ListItem } from "@/lib/types";
import { getProduct } from "@/lib/data/catalog";
import { useApp } from "@/lib/state/store";
import { Badge, QtyStepper } from "../ui/primitives";
import { Button } from "../ui/Button";

export function ItemCard({ item }: { item: ListItem }) {
  const { dispatch } = useApp();
  const product = getProduct(item.productId);
  const update = (patch: Partial<ListItem>) => dispatch({ type: "updateItem", id: item.id, patch });
  const confirm = (patch: Partial<ListItem> = {}) => update({ ...patch, review: null, confidence: "high", source: "user" });
  const remove = () => dispatch({ type: "removeItem", id: item.id });

  if (!product) return <UnmatchedCard item={item} onRemove={remove} />;

  const brands = Array.from(new Set(product.offerings.map((o) => o.brand).filter((b) => b !== "STORE" && b !== "Fresh")));
  const needsLook = !!item.review;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border bg-surface p-4 ${needsLook ? "border-review/30" : "border-line"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink">{item.displayName}</h3>
            {needsLook && (
              <Badge tone="review">
                <HelpCircle size={12} /> {item.confidence === "low" ? "Unsure" : "Check this"}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-muted" title={item.rawText}>
            From “{item.rawText}” · {item.category}
          </p>
        </div>
        <QtyStepper value={item.quantity} unit={item.soldBy} label={item.displayName} onChange={(quantity) => update({ quantity })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {product.variants.length > 1 ? (
          <Select
            label="Size / type"
            value={item.variantId ?? product.defaultVariantId}
            onChange={(variantId) => confirm({ variantId })}
            options={product.variants.map((v) => ({ value: v.id, label: v.label }))}
          />
        ) : (
          <span className="inline-flex h-8 items-center rounded-full bg-black/[0.04] px-3 text-[13px] text-ink-2">
            {product.variants[0].label}
          </span>
        )}
        {brands.length > 0 && (
          <Select
            label="Brand"
            value={item.brand ?? ""}
            onChange={(b) => update({ brand: b || null })}
            options={[{ value: "", label: "Any brand" }, ...brands.map((b) => ({ value: b, label: b }))]}
          />
        )}
        <RemoveButton onClick={remove} label={item.displayName} />
      </div>

      {item.review && (
        <div className="mt-3 rounded-xl bg-review-soft px-3.5 py-3">
          <p className="text-[13.5px] leading-snug text-[#6b4108]">{item.review.message}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {item.review.options.map((o) => {
              const selected = o.variantId === item.variantId;
              return (
                <button
                  key={o.variantId}
                  onClick={() => confirm({ variantId: o.variantId })}
                  aria-pressed={selected}
                  className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] transition-colors ${
                    selected ? "border-review/50 bg-white font-medium text-ink" : "border-transparent bg-white/60 text-ink-2 hover:bg-white"
                  }`}
                >
                  {selected && <Check size={13} className="text-review" />} {o.label}
                </button>
              );
            })}
            <button onClick={() => confirm()} className="ml-auto h-8 px-2 text-[13px] font-medium text-review hover:underline">
              {item.review.options.length ? "Keep suggestion" : "Looks right"}
            </button>
          </div>
        </div>
      )}
    </motion.li>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove ${label}`}
      title="Remove"
      className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 size={15} />
    </button>
  );
}

function UnmatchedCard({ item, onRemove }: { item: ListItem; onRemove: () => void }) {
  const { rephrase, state } = useApp();
  const [text, setText] = useState(item.rawText);
  const busy = state.parse.status === "loading";
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-dashed border-line-strong bg-surface p-4">
      <div className="flex items-start gap-3">
        <SearchX size={18} className="mt-0.5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{item.displayName}</h3>
            <Badge tone="danger">Not recognized</Badge>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">{item.review?.message}</p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) rephrase(item.id, text.trim());
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Rephrase item"
              className="h-9 min-w-0 flex-1 rounded-full border border-line px-3.5 text-[14px] focus:border-line-strong focus:outline-none"
            />
            <Button size="sm" variant="secondary" type="submit" disabled={busy || !text.trim()} className="h-9">
              Try again
            </Button>
            <RemoveButton onClick={onRemove} label={item.displayName} />
          </form>
        </div>
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
        className="h-8 appearance-none rounded-full border border-line bg-surface pr-8 pl-3 text-[13px] text-ink hover:border-line-strong focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted" />
    </label>
  );
}
