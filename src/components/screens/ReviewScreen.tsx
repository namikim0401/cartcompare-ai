"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Info, Plus, Sparkles } from "lucide-react";
import { useApp } from "@/lib/state/store";
import { ItemCard } from "../review/ItemCard";
import { Button } from "../ui/Button";
import { ScreenHeader } from "../ui/primitives";
import { BottomBar } from "../AppShell";

export function ReviewScreen() {
  const { state, dispatch, priceable, addFromText } = useApp();
  const [draft, setDraft] = useState("");
  const busy = state.parse.status === "loading";

  const toCheck = state.items.filter((i) => i.review && i.productId).length;
  const unrecognized = state.items.length - priceable.length;
  const by = state.parse.mode === "ai" ? "AI" : "the demo parser";

  const hint =
    unrecognized > 0
      ? `${unrecognized} unrecognized item${unrecognized > 1 ? "s" : ""} won't be priced.`
      : toCheck > 0
        ? `We'll use our suggestions for ${toCheck} unchecked item${toCheck > 1 ? "s" : ""}.`
        : undefined;

  return (
    <div>
      <ScreenHeader
        title="Check your list"
        subtitle={
          <>
            {state.items.length} item{state.items.length === 1 ? "" : "s"}, organized by {by}.{" "}
            {toCheck > 0 ? (
              <span className="text-review">
                {toCheck} need{toCheck === 1 ? "s" : ""} a quick look.
              </span>
            ) : (
              "Edit anything that's off."
            )}
          </>
        }
      />

      {state.parse.notice && (
        <div className="mb-4 flex gap-2.5 rounded-xl bg-info-soft p-3.5 text-[13.5px] leading-snug text-[#3b4a6b]" role="status">
          <Info size={16} className="mt-0.5 shrink-0" /> {state.parse.notice}
        </div>
      )}

      {state.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-8 text-center text-[14px] text-muted">
          Your list is empty. Add an item below or go back.
        </div>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence initial={false}>
            {state.items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          if (await addFromText(draft.trim())) setDraft("");
        }}
      >
        <label htmlFor="add-item" className="sr-only">
          Add another item
        </label>
        <div className="relative flex-1">
          <Plus size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            id="add-item"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add another item, e.g. “2 avocados”"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-[15px] placeholder:text-muted/70 focus:border-line-strong focus:outline-none"
          />
        </div>
        <Button variant="secondary" type="submit" disabled={busy || !draft.trim()} className="h-11">
          {busy ? <Sparkles size={15} className="animate-pulse" /> : "Add"}
        </Button>
      </form>
      {state.parse.status === "error" && <p className="mt-2 text-[13px] text-danger">{state.parse.error}</p>}

      <BottomBar hint={hint}>
        <Button variant="secondary" size="md" className="h-12 w-12 shrink-0 px-0" aria-label="Back to list" onClick={() => dispatch({ type: "goto", step: "list" })}>
          <ArrowLeft size={18} />
        </Button>
        <Button size="lg" disabled={priceable.length === 0} onClick={() => dispatch({ type: "goto", step: "compare" })}>
          Compare {priceable.length} item{priceable.length === 1 ? "" : "s"} <ArrowRight size={16} />
        </Button>
      </BottomBar>
    </div>
  );
}
