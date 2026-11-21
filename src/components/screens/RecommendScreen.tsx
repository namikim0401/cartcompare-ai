"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, RotateCcw, ShieldCheck, Sparkles, Calculator } from "lucide-react";
import { useApp } from "@/lib/state/store";
import { buildFacts, templateExplanation } from "@/lib/recommend/explain";
import { PLATFORMS, STORES } from "@/lib/data/market";
import { money } from "@/lib/money";
import type { CartQuote, ExplainResponse } from "@/lib/types";
import { FeeBreakdown, LineList, totalFees } from "../compare/QuoteCard";
import { PreferencesPanel } from "../compare/PreferencesPanel";
import { DemoDataNotice } from "../compare/DemoDataNotice";
import { Button } from "../ui/Button";
import { PlatformMark } from "../ui/primitives";
import { BottomBar, useAiEnabled } from "../AppShell";

export function RecommendScreen() {
  const { quotes, priceable, state, dispatch } = useApp();
  const ai = useAiEnabled();
  const facts = useMemo(() => buildFacts(quotes), [quotes]);
  const template = useMemo(() => templateExplanation(facts), [facts]);
  const complete = quotes.filter((q) => q.complete);
  const best = complete[0];

  // Template text shows instantly; in AI mode we upgrade to model-phrased text
  // once the server has verified every number in it against the engine.
  const [aiText, setAiText] = useState<{ key: string; res: ExplainResponse } | null>(null);
  const key = JSON.stringify([priceable.map((i) => [i.productId, i.variantId, i.brand, i.quantity]), state.prefs]);
  useEffect(() => {
    if (!ai || !best) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: priceable, prefs: state.prefs }),
          signal: ctrl.signal,
        });
        if (res.ok) setAiText({ key, res: await res.json() });
      } catch {
        /* keep template */
      }
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ai, !!best]);

  const current = aiText?.key === key ? aiText.res : null;
  const pending = ai && !!best && !current;
  const text = current?.text ?? template;
  const source = current?.source ?? "template";

  const restart = () => {
    if (confirm("Start a new list? Your current list will be cleared.")) dispatch({ type: "reset" });
  };

  return (
    <div>
      {best ? (
        <motion.section
          key={best.channelId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-6"
        >
          <p className="text-[12px] font-medium tracking-wide text-accent uppercase">Best option for your cart</p>
          <div className="mt-3 flex items-center gap-3">
            <PlatformMark platformId={best.platformId} name={PLATFORMS[best.platformId].name} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">{best.label}</h1>
              <p className="text-[13px] text-muted">{state.prefs.fulfillment === "delivery" ? "Delivery" : "Pickup"} · estimated total</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="tabular text-[40px] leading-none font-semibold tracking-[-0.03em]">{money(best.total)}</span>
            {facts.mostExpensive && (
              <span className="tabular rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent">
                Save {facts.mostExpensive.youSave}
              </span>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-canvas p-4">
            <p className={`text-[14.5px] leading-relaxed text-ink transition-opacity ${pending ? "opacity-70" : ""}`}>{text}</p>
            <p className="mt-2.5 flex items-center gap-1.5 text-[12px] text-muted">
              {source === "ai" ? (
                <>
                  <ShieldCheck size={13} className="text-accent" /> Written by AI · every number checked against the pricing engine
                </>
              ) : pending ? (
                <>
                  <Sparkles size={13} className="animate-pulse" /> Asking AI to explain…
                </>
              ) : (
                <>
                  <Calculator size={13} /> Generated directly from the pricing engine
                </>
              )}
            </p>
            {current?.note && <p className="mt-1 text-[12px] text-review">{current.note}</p>}
          </div>
        </motion.section>
      ) : (
        <div className="rounded-3xl border border-dashed border-line-strong p-6">
          <h1 className="text-[20px] font-semibold">No recommendation yet</h1>
          <p className="mt-1.5 text-[14px] text-ink-2">{template}</p>
        </div>
      )}

      <div className="mt-4">
        <PreferencesPanel />
      </div>

      {complete.length > 1 && (
        <section className="mt-8">
          <h2 className="text-[13px] font-medium tracking-wide text-muted uppercase">Where the money goes</h2>
          <CostBars quotes={complete} />
        </section>
      )}

      {best && (
        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">Your cart at {best.label}</h2>
          <div className="rounded-2xl border border-line bg-surface px-4 pt-1 pb-4">
            <LineList lines={best.lines} />
            <div className="mt-3 border-t border-line pt-3">
              <FeeBreakdown quote={best} />
            </div>
          </div>
          <p className="mt-3 text-center text-[12.5px] text-muted">
            CartCompare doesn&apos;t place orders. Check out on {PLATFORMS[best.platformId].name} — final prices may differ.
          </p>
        </section>
      )}

      <div className="mt-6">
        <DemoDataNotice />
      </div>

      <BottomBar>
        <Button variant="secondary" className="h-12 w-12 shrink-0 px-0" aria-label="Back to comparison" onClick={() => dispatch({ type: "goto", step: "compare" })}>
          <ArrowLeft size={18} />
        </Button>
        <Button size="lg" variant="secondary" onClick={() => dispatch({ type: "goto", step: "review" })}>
          Edit list
        </Button>
        <Button variant="ghost" className="h-12 shrink-0" onClick={restart} aria-label="Start a new list">
          <RotateCcw size={16} /> New
        </Button>
      </BottomBar>
    </div>
  );
}

/** Stacked bars: item subtotal vs fees vs tax, minus promos. Makes "why" visible. */
function CostBars({ quotes }: { quotes: CartQuote[] }) {
  const max = Math.max(...quotes.map((q) => q.subtotal + totalFees(q) + q.tax));
  const pct = (c: number) => `${(c / max) * 100}%`;
  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
      <ul className="space-y-3.5">
        {quotes.map((q, i) => (
          <li key={q.channelId}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className={i === 0 ? "font-medium text-ink" : "text-ink-2"}>
                {PLATFORMS[q.platformId].name} <span className="text-muted">× {STORES[q.storeId].name}</span>
              </span>
              <span className={`tabular ${i === 0 ? "font-semibold text-ink" : "text-ink-2"}`}>{money(q.total)}</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-black/[0.04]" aria-hidden>
              <motion.span layout className={`h-full ${i === 0 ? "bg-accent" : "bg-ink/80"}`} style={{ width: pct(q.subtotal) }} />
              <motion.span layout className="h-full bg-ink/30" style={{ width: pct(totalFees(q)) }} />
              <motion.span layout className="h-full bg-ink/15" style={{ width: pct(q.tax) }} />
            </div>
            {q.discount > 0 && <p className="mt-1 text-[12px] text-accent">Includes −{money(q.discount)} promo</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <Legend className="bg-ink/80" label="Items" />
        <Legend className="bg-ink/30" label="Delivery & service fees" />
        <Legend className="bg-ink/15" label="Tax" />
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} /> {label}
    </span>
  );
}
