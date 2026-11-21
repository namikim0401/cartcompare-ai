"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Pencil, Plus, Sparkles, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApp } from "@/lib/state/store";
import { Button } from "../ui/Button";
import { ScreenHeader } from "../ui/primitives";
import { BottomBar, useAiEnabled } from "../AppShell";

const SAMPLES = [
  { label: "Quick run", text: "I need a gallon of milk, 12 eggs, 2 pounds of bananas, oat milk, and some bread." },
  {
    label: "Weekly shop",
    text: "Oatly oat milk, 2 dozen eggs, a gallon of 2% milk, 3 lbs bananas, whole wheat bread, 2 lbs chicken breast, Barilla spaghetti, Rao's marinara, greek yogurt, baby spinach, coffee, paper towels",
  },
];

export function ListScreen() {
  const { state, dispatch, organize } = useApp();
  const ai = useAiEnabled();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loading = state.parse.status === "loading";

  const entries = state.entries;
  const setEntries = (e: string[]) => dispatch({ type: "entries", entries: e });

  const add = (text = draft) => {
    const t = text.trim();
    if (!t) return;
    setEntries([...entries, t]);
    setDraft("");
    inputRef.current?.focus();
  };

  const allEntries = draft.trim() ? [...entries, draft.trim()] : entries;
  const joined = allEntries.join("\n");
  const hasItems = state.items.length > 0;
  const stale = hasItems && state.parsedFrom !== joined;

  const submit = async () => {
    if (draft.trim()) {
      setEntries(allEntries);
      setDraft("");
    }
    if (hasItems && !stale) return dispatch({ type: "goto", step: "review" });
    const ok = await organize(allEntries);
    if (ok) dispatch({ type: "goto", step: "review" });
  };

  return (
    <div>
      <ScreenHeader
        title="What do you need?"
        subtitle="Write it the way you'd say it. We'll turn it into a structured list you can check before comparing prices."
      />

      {/* Composer */}
      <div className="animate-rise rounded-2xl border border-line bg-surface p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-line-strong">
        <label htmlFor="composer" className="sr-only">
          Add grocery items
        </label>
        <textarea
          id="composer"
          ref={inputRef}
          value={draft}
          disabled={loading}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              add();
            }
          }}
          rows={3}
          placeholder="e.g. a gallon of milk, a dozen eggs, 2 lbs of bananas…"
          className="block w-full resize-none rounded-xl bg-transparent px-3 pt-2.5 pb-1 text-[16px] leading-relaxed text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-1">
          <span className="hidden text-[12px] text-muted sm:block">Enter to add · Shift + Enter for a new line</span>
          <span className="text-[12px] text-muted sm:hidden">One item or a whole sentence</span>
          <Button size="sm" variant="secondary" onClick={() => add()} disabled={!draft.trim() || loading}>
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>

      {entries.length === 0 && !draft && (
        <div className="mt-4 flex flex-wrap items-center gap-2 animate-rise">
          <span className="text-[13px] text-muted">Try a sample:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setEntries([s.text])}
              className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <section className="mt-7" aria-label="Your list">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium tracking-wide text-muted uppercase">Your list</h2>
            <button onClick={() => setEntries([])} className="text-[12.5px] text-muted hover:text-ink" disabled={loading}>
              Clear
            </button>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            <AnimatePresence initial={false}>
              {entries.map((entry, i) => (
                <motion.li
                  key={`${i}-${entry}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="group"
                >
                  {editing === i ? (
                    <form
                      className="flex items-center gap-2 px-3 py-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const t = editText.trim();
                        setEntries(t ? entries.map((x, j) => (j === i ? t : x)) : entries.filter((_, j) => j !== i));
                        setEditing(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setEditing(null)}
                        className="h-9 flex-1 rounded-lg border border-line-strong px-2.5 text-[15px] focus:outline-none"
                        aria-label="Edit entry"
                      />
                      <Button size="sm" type="submit" aria-label="Save">
                        <Check size={14} />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <p className="flex-1 text-[15px] leading-relaxed text-ink">{entry}</p>
                      <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <button
                          aria-label={`Edit “${entry}”`}
                          disabled={loading}
                          onClick={() => {
                            setEditing(i);
                            setEditText(entry);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-black/[0.04] hover:text-ink"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          aria-label={`Remove “${entry}”`}
                          disabled={loading}
                          onClick={() => setEntries(entries.filter((_, j) => j !== i))}
                          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-black/[0.04] hover:text-danger"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {loading && <OrganizingState ai={ai} />}

      {state.parse.status === "error" && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-[14px] text-danger animate-rise">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">We couldn't organize your list.</p>
            <p className="mt-0.5 opacity-90">{state.parse.error} Your entries are saved — try again.</p>
          </div>
        </div>
      )}

      <BottomBar
        hint={
          stale ? "Your list changed — organizing again will replace the reviewed items." : allEntries.length === 0 ? undefined : null
        }
      >
        <Button size="lg" onClick={submit} disabled={allEntries.length === 0 || loading}>
          {loading ? (
            <>
              <Spinner /> Organizing…
            </>
          ) : hasItems && !stale ? (
            <>
              Continue to review <ArrowRight size={16} />
            </>
          ) : (
            <>
              <Sparkles size={16} /> {stale ? "Re-organize list" : "Organize my list"}
            </>
          )}
        </Button>
      </BottomBar>
    </div>
  );
}

function OrganizingState({ ai }: { ai: boolean }) {
  return (
    <div className="mt-7 animate-rise" aria-live="polite">
      <p className="mb-3 flex items-center gap-2 text-[13.5px] text-ink-2">
        <Sparkles size={14} className="text-accent" />
        {ai ? "AI is reading your list and matching products…" : "Demo parser is reading your list…"}
      </p>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-surface p-4" style={{ opacity: 1 - i * 0.25 }}>
            <div className="skeleton h-3.5 w-1/3 rounded" />
            <div className="skeleton mt-2.5 h-3 w-1/2 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />;
}
