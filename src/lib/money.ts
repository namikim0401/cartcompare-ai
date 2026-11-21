import type { Cents } from "./types";

const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const money = (c: Cents): string => fmt.format(c / 100);

export const formatQty = (qty: number, soldBy: "each" | "lb"): string =>
  soldBy === "lb" ? `${qty} lb` : `×${qty}`;
