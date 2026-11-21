import { FlaskConical } from "lucide-react";

/** Persistent, plain-language disclosure. Prices are never presented as live. */
export function DemoDataNotice() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-2.5 text-[12.5px] leading-snug text-ink-2">
      <FlaskConical size={14} className="mt-0.5 shrink-0" />
      <span>
        <strong className="font-medium text-ink">Demo prices.</strong> Simulated data for illustration — not live prices from DoorDash, Uber
        Eats, Instacart, Target or Safeway, and not affiliated with them.
      </span>
    </p>
  );
}
