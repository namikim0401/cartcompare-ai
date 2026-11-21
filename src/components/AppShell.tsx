"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles, FlaskConical } from "lucide-react";
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
      <main className="flex-1 pt-6 pb-32">
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
    <div className="flex items-center justify-between pt-5 pb-4">
      <button onClick={() => dispatch({ type: "goto", step: "list" })} className="flex items-center gap-2" aria-label="CartCompare home">
        <Logo />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">CartCompare</span>
      </button>
      {ai ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2">
          <Sparkles size={13} className="text-accent" /> AI on
        </span>
      ) : (
        <span
          title="No API key configured. List parsing is rule-based and explanations come from templates."
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2"
        >
          <FlaskConical size={13} /> Demo mode
        </span>
      )}
    </div>
  );
}

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect width="26" height="26" rx="8" fill="#16161a" />
      <path d="M7 9h1.6l1.7 7.2h6.4L18.4 11H10" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="19" r="1.2" fill="#7fd1ae" />
      <circle cx="16.3" cy="19" r="1.2" fill="#7fd1ae" />
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
    <nav aria-label="Progress" className="sticky top-0 z-20 -mx-4 bg-canvas/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <li key={s.id}>
              <button
                disabled={!reachable[s.id]}
                onClick={() => dispatch({ type: "goto", step: s.id })}
                aria-current={active ? "step" : undefined}
                className="group w-full text-left disabled:cursor-not-allowed"
              >
                <span className={`block h-[3px] rounded-full transition-colors ${active || done ? "bg-ink" : "bg-line-strong/70"}`} />
                <span
                  className={`mt-1.5 block text-[12px] font-medium transition-colors ${
                    active ? "text-ink" : reachable[s.id] ? "text-muted group-hover:text-ink" : "text-muted/50"
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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[560px] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
        {hint && <div className="mb-2 text-center text-[12.5px] text-muted">{hint}</div>}
        <div className="flex gap-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
