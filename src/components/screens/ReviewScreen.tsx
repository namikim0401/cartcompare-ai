"use client";

import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, Info, Plus } from "lucide-react";
import { useApp } from "@/lib/state/store";
import type { ListItem } from "@/lib/types";
import { ItemCard } from "../review/ItemCard";
import { Button } from "../ui/Button";
import { ScreenHeader, SectionLabel } from "../ui/primitives";
import { BottomBar } from "../AppShell";

export function ReviewScreen() {
  const { state, dispatch, priceable, addFromText } = useApp();
  const [draft, setDraft] = useState("");
  const busy = state.parse.status === "loading";

  // Items the matcher wasn't sure about go first, so attention goes where it's needed.
  const needsLook = state.items.filter((i) => i.review || !i.productId);
  const good = state.items.filter((i) => !i.review && i.productId);
  const toCheck = state.items.filter((i) => i.review && i.productId).length;
  const unrecognized = state.items.length - priceable.length;

  const hint =
    unrecognized > 0
      ? `${unrecognized} item${unrecognized > 1 ? "s" : ""} not found won't be priced`
      : toCheck > 0
        ? `We'll use our best guess for ${toCheck} unchecked item${toCheck > 1 ? "s" : ""}`
        : "Everything's matched";

  return (
    <div>
      <ScreenHeader
        eyebrow="Review"
        title={toCheck + unrecognized > 0 ? "A quick check before we shop." : "Your list looks good."}
        subtitle={
          toCheck + unrecognized > 0
            ? "We matched your list to real products. A few things were ambiguous — pick what you meant, or keep our guess."
            : "Every item is matched. Adjust sizes, brands or quantities if you like."
        }
      />

      {state.parse.notice && (
        <p className="mb-4 flex gap-2 border-l-2 border-line-strong pl-3 text-[13px] leading-snug text-ink-2" role="status">
          <Info size={15} className="mt-0.5 shrink-0" /> {state.parse.notice}
        </p>
      )}

      {state.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-paper/60 p-6 text-center text-[14px] text-ink-2">
          Your list is empty. Add something below, or go back to start a list.
        </div>
      ) : (
        <div className="space-y-6">
          {needsLook.length > 0 && <Sheet label="Needs a look" count={needsLook.length} items={needsLook} />}
          {good.length > 0 && <Sheet label="Matched" count={good.length} items={good} />}
        </div>
      )}

      <form
        className="mt-5 flex gap-2"
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
          <Plus size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            id="add-item"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Forgot something?"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pr-3 pl-9 text-[15px] placeholder:text-muted/80 focus:border-ink/50 focus:outline-none"
          />
        </div>
        <Button variant="secondary" type="submit" disabled={busy || !draft.trim()} className="h-11">
          {busy ? "Adding…" : "Add"}
        </Button>
      </form>
      {state.parse.status === "error" && <p className="mt-2 text-[13px] text-danger">{state.parse.error}</p>}

      <BottomBar hint={hint}>
        <Button variant="secondary" className="h-12 w-12 shrink-0 px-0" aria-label="Back to list" onClick={() => dispatch({ type: "goto", step: "list" })}>
          <ArrowLeft size={18} />
        </Button>
        <Button size="lg" disabled={priceable.length === 0} onClick={() => dispatch({ type: "goto", step: "compare" })}>
          Compare cart prices <span className="tabular rounded-sm bg-white/15 px-1.5 text-[12.5px]">{priceable.length}</span>
          <ArrowRight size={16} />
        </Button>
      </BottomBar>
    </div>
  );
}

function Sheet({ label, count, items }: { label: string; count: number; items: ListItem[] }) {
  return (
    <section>
      <SectionLabel aside={`${count}`}>{label}</SectionLabel>
      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}
