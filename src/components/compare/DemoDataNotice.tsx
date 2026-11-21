import { FlaskConical } from "lucide-react";

/** Persistent, plain-language disclosure. Prices are never presented as live. */
export function DemoDataNotice() {
  return (
    <p className="flex items-start gap-2 border-l-2 border-review/40 pl-3 text-[12.5px] leading-snug text-ink-2">
      <FlaskConical size={14} className="mt-0.5 shrink-0 text-review" />
      <span>
        <strong className="font-medium text-ink">Simulated prices.</strong> Demo data for illustration — not live prices from DoorDash, Uber
        Eats, Instacart, Target or Safeway, and not affiliated with them.
      </span>
    </p>
  );
}
