"use client";

import { Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { PlatformId } from "@/lib/types";

/* --------------------------------- Badge --------------------------------- */

type Tone = "neutral" | "accent" | "review" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-black/[0.05] text-ink-2",
  accent: "bg-accent-soft text-accent",
  review: "bg-review-soft text-review",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-[#3b4a6b]",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-5 ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/* --------------------------------- Toggle -------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2.5">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line-strong"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : ""}`}
        />
      </button>
    </label>
  );
}

/* ------------------------------- Segmented ------------------------------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-black/[0.05] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-full px-3.5 text-[13px] font-medium transition-all ${
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ QtyStepper ------------------------------- */

export function QtyStepper({
  value,
  onChange,
  unit,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  unit: "each" | "lb";
  label: string;
}) {
  const step = unit === "lb" ? 0.5 : 1;
  const min = unit === "lb" ? 0.5 : 1;
  return (
    <div className="inline-flex h-8 items-center rounded-full border border-line bg-surface" aria-label={`Quantity for ${label}`}>
      <button
        type="button"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:text-ink disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span className="tabular min-w-[2.75rem] text-center text-[13px] font-medium">
        {unit === "lb" ? `${value} lb` : value}
      </span>
      <button
        type="button"
        aria-label="Increase"
        onClick={() => onChange(Math.min(50, +(value + step).toFixed(2)))}
        className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:text-ink"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ------------------------------ PlatformMark ----------------------------- */

const platformColor: Record<PlatformId, string> = {
  doordash: "bg-doordash",
  ubereats: "bg-ubereats",
  instacart: "bg-instacart",
};

/** Neutral monogram, not a logo: we're not affiliated with these platforms. */
export function PlatformMark({ platformId, name }: { platformId: PlatformId; name: string }) {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-[13px] font-semibold text-ink">
      {name.charAt(0)}
      <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${platformColor[platformId]}`} />
    </span>
  );
}

/* -------------------------------- Section -------------------------------- */

export function ScreenHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-6 animate-rise">
      <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
      {children}
    </header>
  );
}
