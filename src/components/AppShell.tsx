"use client";

import { AnimatePresence, motion } from "motion/react";
import { AppProvider, STEPS, useApp, type Step } from "@/lib/state/store";
import { ListScreen } from "./screens/ListScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { CompareScreen } from "./screens/CompareScreen";
import { RecommendScreen } from "./screens/RecommendScreen";
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const AiContext = createContext(false);
export const useAiEnabled = () => useContext(AiContext);

export function AppShell({ aiEnabled }: { aiEnabled: boolean }) {
  return (
    <AiContext.Provider value={aiEnabled}>
      <AppProvider>
        <Shell />
      </AppProvider>
    </AiContext.Provider>
  );
}

function Shell() {
  const { state } = useApp();
  // Each step is a new "page": start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 sm:px-6">
      <TopBar />
      <Stepper />
      <main className="flex-1 pt-5 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {state.step === "list" && <ListScreen />}
            {state.step === "review" && <ReviewScreen />}
            {state.step === "compare" && <CompareScreen />}
            {state.step === "recommend" && <RecommendScreen />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function TopBar() {
  const ai = useAiEnabled();
  const { dispatch } = useApp();
  return (
    <div className="flex items-center justify-between border-b border-line pt-4 pb-3">
      <button onClick={() => dispatch({ type: "goto", step: "list" })} className="flex items-center gap-2" aria-label="CartCompare home">
        <Logo />
        <span className="display text-[23px] leading-none tracking-[-0.01em]">
          Cart<em className="text-accent">compare</em>
        </span>
      </button>
      <span
        title={
          ai
            ? "Items are matched with AI. Prices are simulated demo data."
            : "No API key configured: rule-based matching, template explanations, simulated prices."
        }
        className="text-[11.5px] font-medium tracking-wide text-muted"
      >
        {ai ? "Demo prices" : "Demo mode · simulated prices"}
      </span>
    </div>
  );
}

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#2f5d43" />
      <path d="M6.2 8.2h1.5l1.6 6.6h5.9l1.6-4.8H8.9" stroke="#fbf9f4" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="17.6" r="1.1" fill="#fbf9f4" />
      <circle cx="14.9" cy="17.6" r="1.1" fill="#fbf9f4" />
    </svg>
  );
}

function Stepper() {
  const { state, dispatch, priceable } = useApp();
  const reachable: Record<Step, boolean> = {
    list: true,
    review: state.items.length > 0,
    compare: priceable.length > 0,
    recommend: priceable.length > 0,
  };
  const current = STEPS.findIndex((s) => s.id === state.step);
  return (
    <nav aria-label="Progress" className="sticky top-0 z-20 -mx-4 bg-canvas/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <ol className="flex items-center gap-4 overflow-x-auto py-2.5 no-scrollbar">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={s.id} className="shrink-0">
              <button
                disabled={!reachable[s.id]}
                onClick={() => dispatch({ type: "goto", step: s.id })}
                aria-current={active ? "step" : undefined}
                className="group flex items-baseline gap-1.5 disabled:cursor-not-allowed"
              >
                <span className={`tabular text-[11px] font-medium ${active ? "text-accent" : done ? "text-ink-2" : "text-muted/60"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`border-b pb-0.5 text-[13px] transition-colors ${
                    active
                      ? "border-ink font-medium text-ink"
                      : reachable[s.id]
                        ? "border-transparent text-muted group-hover:text-ink"
                        : "border-transparent text-muted/50"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Sticky bottom action area, thumb-reachable on mobile. Portaled to <body> so the
 * animated (transformed) screen container doesn't break `position: fixed`.
 */
export function BottomBar({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[560px] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
        {hint && <div className="mb-2 text-center text-[12.5px] text-muted">{hint}</div>}
        <div className="flex gap-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
