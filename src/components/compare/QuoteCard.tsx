"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, CircleCheck, Repeat, CircleSlash, Trophy } from "lucide-react";
import type { CartQuote, QuoteLine } from "@/lib/types";
import { PLATFORMS, STORES } from "@/lib/data/market";
import { getProduct } from "@/lib/data/catalog";
import { money } from "@/lib/money";
import { Badge, PlatformMark } from "../ui/primitives";

export const totalFees = (q: CartQuote) => q.deliveryFee + q.serviceFee + q.smallOrderFee + q.pickupFee;

export function QuoteCard({
  quote,
  isBest,
  bestTotal,
  rank,
}: {
  quote: CartQuote;
  isBest: boolean;
  bestTotal: number | null;
  rank?: number;
}) {
  const [open, setOpen] = useState(false);
  const platform = PLATFORMS[quote.platformId];
  const brandSwaps = quote.lines.filter((l) => l.status === "matched" && l.brandChanged).length;
  const diff = bestTotal != null && quote.complete && !isBest ? quote.total - bestTotal : null;

  return (
    <motion.li
      layout="position"
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
      className={`relative border-b border-line last:border-b-0 ${isBest ? "bg-accent-soft/40" : "bg-surface"}`}
    >
      {isBest && <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" aria-hidden />}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full px-4 py-3.5 text-left">
        <div className="flex items-start gap-3">
          <PlatformMark platformId={quote.platformId} name={platform.name} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              {rank != null && <span className="tabular text-[11px] font-medium text-muted">{String(rank).padStart(2, "0")}</span>}
              <span className="text-[15px] font-medium text-ink">{platform.name}</span>
              <span className="text-[13px] text-muted">× {STORES[quote.storeId].name}</span>
            </div>
            {isBest ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
                <Trophy size={12} /> Cheapest complete cart
              </span>
            ) : (
              <span className="mt-0.5 block text-[12px] text-muted">
                Items {money(quote.subtotal)} · Fees {money(totalFees(quote))}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className={`display tabular text-[26px] leading-none ${quote.complete ? "text-ink" : "text-muted line-through decoration-1"}`}>
              {money(quote.total)}
            </div>
            <div className="tabular mt-1 text-[12px] text-muted">
              {diff != null ? `+${money(diff)}` : quote.complete ? "est. total" : "partial cart"}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[52px]">
          {isBest && (
            <>
              <Badge>Items {money(quote.subtotal)}</Badge>
              <Badge>Fees {money(totalFees(quote))}</Badge>
            </>
          )}
          {quote.discount > 0 && <Badge tone="accent">−{money(quote.discount)} promo</Badge>}
          {quote.substitutedCount > 0 && <Badge tone="review">{quote.substitutedCount} substituted</Badge>}
          {quote.missingCount > 0 && <Badge tone="danger">{quote.missingCount} missing</Badge>}
          {brandSwaps > 0 && <Badge tone="info">{brandSwaps} brand swap{brandSwaps > 1 ? "s" : ""}</Badge>}
          <ChevronDown size={15} className={`ml-auto text-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 pt-3 pb-4">
              <FeeBreakdown quote={quote} />
              <h4 className="eyebrow mt-5 mb-1">Items</h4>
              <LineList lines={quote.lines} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function FeeBreakdown({ quote }: { quote: CartQuote }) {
  const rows: [string, number, string?][] = [
    ["Item subtotal", quote.subtotal],
    ...(quote.deliveryFee ? ([["Delivery fee", quote.deliveryFee]] as [string, number][]) : []),
    ...(quote.pickupFee ? ([["Pickup fee", quote.pickupFee]] as [string, number][]) : []),
    ["Service fee", quote.serviceFee],
    ...(quote.smallOrderFee ? ([["Small order fee", quote.smallOrderFee]] as [string, number][]) : []),
    ["Estimated tax", quote.tax, quote.tax === 0 ? "Groceries untaxed" : "Taxable items only"],
  ];
  return (
    <dl className="tabular space-y-1.5 text-[13.5px]">
      {rows.map(([k, v, note]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-ink-2">
            {k} {note && <span className="text-[12px] text-muted">· {note}</span>}
          </dt>
          <dd className="text-ink">{money(v)}</dd>
        </div>
      ))}
      {quote.discount > 0 && (
        <div className="flex justify-between gap-4 text-accent">
          <dt>{quote.discountLabel}</dt>
          <dd>−{money(quote.discount)}</dd>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-line-strong pt-2.5 font-medium text-ink">
        <dt>Estimated total</dt>
        <dd className="display text-[22px] leading-none">{money(quote.total)}</dd>
      </div>
      {!quote.complete && quote.missingCount > 0 && (
        <p className="pt-1 text-[12.5px] text-danger">Excludes {quote.missingCount} missing item{quote.missingCount > 1 ? "s" : ""}, so it isn't comparable.</p>
      )}
    </dl>
  );
}

const statusIcon = {
  matched: <CircleCheck size={15} className="text-accent" />,
  substituted: <Repeat size={15} className="text-review" />,
  missing: <CircleSlash size={15} className="text-danger" />,
};

export function LineList({ lines }: { lines: QuoteLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => {
        const soldBy = l.sku ? getProduct(l.sku.productId)?.soldBy : undefined;
        return (
          <li key={l.itemId} className="flex gap-2.5 py-2.5">
            <span className="mt-0.5 shrink-0">{statusIcon[l.status]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3">
                <span className="text-[13.5px] font-medium text-ink">{l.itemName}</span>
                <span className="tabular text-[13.5px] text-ink">{l.status === "missing" ? "—" : money(l.lineTotal)}</span>
              </div>
              {l.sku && (
                <p className="tabular text-[12.5px] text-muted">
                  {l.sku.brand} · {l.variantLabel} · {soldBy === "lb" ? `${l.quantity} lb × ${money(l.unitPrice)}/lb` : `${l.quantity} × ${money(l.unitPrice)}`}
                </p>
              )}
              {l.note && (
                <p className={`mt-0.5 text-[12.5px] ${l.status === "missing" ? "text-danger" : l.status === "substituted" ? "text-review" : "text-[#3b4a6b]"}`}>
                  {l.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
