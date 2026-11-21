"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { CartQuote, ListItem, ParseResponse, Preferences } from "../types";
import { compareCarts } from "../pricing/engine";
import { mockProvider } from "../pricing/provider";

export type Step = "list" | "review" | "compare" | "recommend";
export const STEPS: { id: Step; label: string }[] = [
  { id: "list", label: "List" },
  { id: "review", label: "Review" },
  { id: "compare", label: "Compare" },
  { id: "recommend", label: "Pick" },
];

interface ParseState {
  status: "idle" | "loading" | "error";
  mode: ParseResponse["mode"] | null;
  notice: string | null;
  error: string | null;
}

export interface AppState {
  step: Step;
  /** Screen 1: what the user typed, one entry per line they added. */
  entries: string[];
  /** Screen 2+: structured items. */
  items: ListItem[];
  /** Entries text the current `items` were parsed from (to detect stale items). */
  parsedFrom: string | null;
  prefs: Preferences;
  parse: ParseState;
}

export const DEFAULT_PREFS: Preferences = {
  stores: ["target", "safeway"],
  brandFlexible: true,
  allowSubstitutions: true,
  fulfillment: "delivery",
};

const initialState: AppState = {
  step: "list",
  entries: [],
  items: [],
  parsedFrom: null,
  prefs: DEFAULT_PREFS,
  parse: { status: "idle", mode: null, notice: null, error: null },
};

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "goto"; step: Step }
  | { type: "entries"; entries: string[] }
  | { type: "parseStart" }
  | { type: "parseDone"; res: ParseResponse; from: string; append: boolean }
  | { type: "parseError"; error: string }
  | { type: "updateItem"; id: string; patch: Partial<ListItem> }
  | { type: "removeItem"; id: string }
  | { type: "replaceItem"; id: string; items: ListItem[] }
  | { type: "prefs"; patch: Partial<Preferences> }
  | { type: "reset" };

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case "hydrate":
      return { ...a.state, parse: { ...initialState.parse, mode: a.state.parse.mode } };
    case "goto":
      return { ...state, step: a.step };
    case "entries":
      return { ...state, entries: a.entries };
    case "parseStart":
      return { ...state, parse: { ...state.parse, status: "loading", error: null } };
    case "parseDone":
      return {
        ...state,
        items: a.append ? [...state.items, ...a.res.items] : a.res.items,
        parsedFrom: a.append ? state.parsedFrom : a.from,
        parse: { status: "idle", mode: a.res.mode, notice: a.res.notice ?? null, error: null },
      };
    case "parseError":
      return { ...state, parse: { ...state.parse, status: "error", error: a.error } };
    case "updateItem":
      return { ...state, items: state.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) };
    case "removeItem":
      return { ...state, items: state.items.filter((i) => i.id !== a.id) };
    case "replaceItem": {
      const idx = state.items.findIndex((i) => i.id === a.id);
      if (idx === -1) return state;
      const items = [...state.items];
      items.splice(idx, 1, ...a.items);
      return { ...state, items };
    }
    case "prefs":
      return { ...state, prefs: { ...state.prefs, ...a.patch } };
    case "reset":
      return { ...initialState };
  }
}

const STORAGE_KEY = "cartcompare:v1";

async function requestParse(text: string): Promise<ParseResponse> {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Something went wrong reading your list.");
  return data as ParseResponse;
}

interface Ctx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  /** Items the engine can price (matched to the catalog). */
  priceable: ListItem[];
  quotes: CartQuote[];
  organize: (entries: string[]) => Promise<boolean>;
  addFromText: (text: string) => Promise<boolean>;
  rephrase: (id: string, text: string) => Promise<boolean>;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrated = useRef(false);

  // Per-device convenience only: restore an in-progress list after refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initialState, ...JSON.parse(raw) } });
    } catch {
      /* storage unavailable — start fresh */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const priceable = useMemo(() => state.items.filter((i) => i.productId), [state.items]);
  // Deterministic and fast (<1ms for this catalog), so it re-ranks instantly on every preference change.
  const quotes = useMemo(() => compareCarts(priceable, state.prefs, mockProvider), [priceable, state.prefs]);

  const run = useCallback(async (text: string, after: (res: ParseResponse) => void) => {
    dispatch({ type: "parseStart" });
    try {
      const res = await requestParse(text);
      after(res);
      return true;
    } catch (e) {
      dispatch({ type: "parseError", error: e instanceof Error ? e.message : "Something went wrong." });
      return false;
    }
  }, []);

  const organize = useCallback(
    (entries: string[]) => {
      const text = entries.join("\n");
      return run(text, (res) => dispatch({ type: "parseDone", res, from: text, append: false }));
    },
    [run],
  );

  const addFromText = useCallback(
    (text: string) => run(text, (res) => dispatch({ type: "parseDone", res, from: text, append: true })),
    [run],
  );

  const rephrase = useCallback(
    (id: string, text: string) =>
      run(text, (res) => {
        dispatch({ type: "replaceItem", id, items: res.items });
        dispatch({ type: "parseDone", res: { ...res, items: [] }, from: text, append: true });
      }),
    [run],
  );

  const value = useMemo(
    () => ({ state, dispatch, priceable, quotes, organize, addFromText, rephrase }),
    [state, priceable, quotes, organize, addFromText, rephrase],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
