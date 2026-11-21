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
  /** Structured items. Each natural-language entry is parsed as soon as it's added. */
  items: ListItem[];
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
  items: [],
  prefs: DEFAULT_PREFS,
  parse: { status: "idle", mode: null, notice: null, error: null },
};

type Action =
  | { type: "hydrate"; state: AppState }
  | { type: "goto"; step: Step }
  | { type: "parseStart" }
  | { type: "parseDone"; res: ParseResponse }
  | { type: "parseError"; error: string }
  | { type: "updateItem"; id: string; patch: Partial<ListItem> }
  | { type: "removeItem"; id: string }
  | { type: "clearItems" }
  | { type: "replaceItem"; id: string; items: ListItem[] }
  | { type: "prefs"; patch: Partial<Preferences> }
  | { type: "reset" };

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case "hydrate":
      return {
        step: a.state.step,
        items: a.state.items ?? [],
        prefs: { ...DEFAULT_PREFS, ...a.state.prefs },
        parse: { ...initialState.parse, mode: a.state.parse?.mode ?? null },
      };
    case "goto":
      return { ...state, step: a.step };
    case "parseStart":
      return { ...state, parse: { ...state.parse, status: "loading", error: null } };
    case "parseDone":
      return {
        ...state,
        items: [...state.items, ...a.res.items],
        parse: { status: "idle", mode: a.res.mode, notice: a.res.notice ?? null, error: null },
      };
    case "parseError":
      return { ...state, parse: { ...state.parse, status: "error", error: a.error } };
    case "updateItem":
      return { ...state, items: state.items.map((i) => (i.id === a.id ? { ...i, ...a.patch } : i)) };
    case "removeItem":
      return { ...state, items: state.items.filter((i) => i.id !== a.id) };
    case "clearItems":
      return { ...state, items: [], step: "list" };
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

const STORAGE_KEY = "cartcompare:v2";

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

  const addFromText = useCallback((text: string) => run(text, (res) => dispatch({ type: "parseDone", res })), [run]);

  const rephrase = useCallback(
    (id: string, text: string) =>
      run(text, (res) => {
        dispatch({ type: "replaceItem", id, items: res.items });
        dispatch({ type: "parseDone", res: { ...res, items: [] } });
      }),
    [run],
  );

  const value = useMemo(
    () => ({ state, dispatch, priceable, quotes, addFromText, rephrase }),
    [state, priceable, quotes, addFromText, rephrase],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
