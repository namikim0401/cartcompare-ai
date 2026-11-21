"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/state/store";
import { QuoteCard } from "../compare/QuoteCard";
import { PreferencesPanel } from "../compare/PreferencesPanel";
import { DemoDataNotice } from "../compare/DemoDataNotice";
import { Button } from "../ui/Button";
import { ScreenHeader } from "../ui/primitives";
import { BottomBar } from "../AppShell";
import { STORES } from "@/lib/data/market";

export function CompareScreen() {
  const { quotes, priceable, dispatch, state } = useApp();
  const complete = quotes.filter((q) => q.complete);
  const incomplete = quotes.filter((q) => !q.complete && !q.unavailableReason);
  const unavailable = quotes.filter((q) => q.unavailableReason);
  const best = complete[0] ?? null;

  return (
    <div>
      <ScreenHeader
        title="Compare carts"
        subtitle={`Your ${priceable.length} items, priced as a complete cart on each platform — fees, tax and promos included.`}
      />

      <div className="space-y-3">
        <PreferencesPanel />
        <DemoDataNotice />
      </div>

      {/* Screen-reader announcement when preferences re-rank results */}
      <p className="sr-only" aria-live="polite">
        {best ? `${best.label} is now cheapest.` : "No complete carts match your preferences."}
      </p>

      <section className="mt-6" aria-label="Ranked options">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium tracking-wide text-muted uppercase">Ranked by estimated total</h2>
          <span className="text-[12.5px] text-muted">{complete.length} complete</span>
        </div>
        {complete.length === 0 ? (
          <EmptyComplete subsOff={!state.prefs.allowSubstitutions} brandStrict={!state.prefs.brandFlexible} />
        ) : (
          <ol className="space-y-2.5">
            {complete.map((q) => (
              <QuoteCard key={q.channelId} quote={q} isBest={q === best} bestTotal={best?.total ?? null} />
            ))}
          </ol>
        )}
      </section>

      {incomplete.length > 0 && (
        <section className="mt-8" aria-label="Incomplete carts">
          <h2 className="text-[13px] font-medium tracking-wide text-muted uppercase">Missing items · not ranked</h2>
          <p className="mt-1 mb-2.5 text-[13px] leading-snug text-muted">
            These look cheaper only because something's left out. Turn on substitutions to fill the gaps.
          </p>
          <ol className="space-y-2.5">
            {incomplete.map((q) => (
              <QuoteCard key={q.channelId} quote={q} isBest={false} bestTotal={null} />
            ))}
          </ol>
        </section>
      )}

      {unavailable.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-medium tracking-wide text-muted uppercase">Not available</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {unavailable.map((q) => (
              <li key={q.channelId} className="flex items-center justify-between gap-3 px-4 py-3 text-[13.5px]">
                <span className="text-ink-2">{q.label}</span>
                <span className="text-right text-[12.5px] text-muted">{q.unavailableReason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-center text-[12px] text-muted">
        Comparing {state.prefs.stores.map((s) => STORES[s].name).join(" and ")} across DoorDash, Uber Eats and Instacart.
      </p>

      <BottomBar>
        <Button variant="secondary" className="h-12 w-12 shrink-0 px-0" aria-label="Back to review" onClick={() => dispatch({ type: "goto", step: "review" })}>
          <ArrowLeft size={18} />
        </Button>
        <Button size="lg" disabled={!best} onClick={() => dispatch({ type: "goto", step: "recommend" })}>
          See recommendation <ArrowRight size={16} />
        </Button>
      </BottomBar>
    </div>
  );
}

function EmptyComplete({ subsOff, brandStrict }: { subsOff: boolean; brandStrict: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
      <p className="text-[14.5px] font-medium text-ink">No option has your whole cart.</p>
      <p className="mt-1 text-[13px] text-muted">
        {subsOff || brandStrict
          ? `Try ${[subsOff && "allowing substitutions", brandStrict && "turning on brand flexibility"].filter(Boolean).join(" or ")} in Preferences.`
          : "Try adding another store or switching to delivery."}
      </p>
    </div>
  );
}
