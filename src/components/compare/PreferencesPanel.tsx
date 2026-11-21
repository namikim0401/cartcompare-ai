"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, SlidersHorizontal, ChevronDown } from "lucide-react";
import { useApp } from "@/lib/state/store";
import { STORES } from "@/lib/data/market";
import type { StoreId } from "@/lib/types";
import { Segmented, Toggle } from "../ui/primitives";

export function PreferencesPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  const p = state.prefs;
  const set = (patch: Partial<typeof p>) => dispatch({ type: "prefs", patch });

  const toggleStore = (id: StoreId) => {
    const next = p.stores.includes(id) ? p.stores.filter((s) => s !== id) : [...p.stores, id];
    if (next.length > 0) set({ stores: next });
  };

  const summary = [
    p.fulfillment === "delivery" ? "Delivery" : "Pickup",
    p.stores.map((s) => STORES[s].name).join(" + "),
    p.brandFlexible ? "Any brand" : "My brands",
    p.allowSubstitutions ? "Subs on" : "Subs off",
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <SlidersHorizontal size={16} className="shrink-0 text-ink-2" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-ink">Preferences</span>
          <span className="block truncate text-[12.5px] text-muted">{summary.join(" · ")}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
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
            <div className="space-y-1 border-t border-line px-4 pt-3 pb-2">
              <div className="flex items-center justify-between gap-4 py-1.5">
                <span className="text-sm font-medium">Get it by</span>
                <Segmented
                  label="Delivery or pickup"
                  value={p.fulfillment}
                  onChange={(fulfillment) => set({ fulfillment })}
                  options={[
                    { value: "delivery", label: "Delivery" },
                    { value: "pickup", label: "Pickup" },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-1.5">
                <span className="text-sm font-medium">Stores</span>
                <div className="flex gap-1.5">
                  {(Object.keys(STORES) as StoreId[]).map((id) => {
                    const on = p.stores.includes(id);
                    const last = on && p.stores.length === 1;
                    return (
                      <button
                        key={id}
                        onClick={() => toggleStore(id)}
                        aria-pressed={on}
                        title={last ? "Keep at least one store" : undefined}
                        className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                          on ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:border-line-strong"
                        } ${last ? "cursor-not-allowed" : ""}`}
                      >
                        {on && <Check size={13} />} {STORES[id].name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Toggle
                checked={p.brandFlexible}
                onChange={(brandFlexible) => set({ brandFlexible })}
                label="Brand flexibility"
                description="Pick the cheapest brand in the same size, even if you named one."
              />
              <Toggle
                checked={p.allowSubstitutions}
                onChange={(allowSubstitutions) => set({ allowSubstitutions })}
                label="Allow substitutions"
                description="If something's out of stock, use a similar item instead of leaving it out."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
