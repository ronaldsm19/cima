import type { LucideIcon } from "lucide-react";

export type StatTint = "brand" | "amber" | "neutral";

const TINTS: Record<StatTint, string> = {
  brand: "bg-brand-tint text-brand",
  amber: "bg-warn-tint text-warn",
  neutral: "bg-[#EDF0EC] text-ink-strong",
};

/** Metric card per README §1: 28px icon tile, 26px mono value, 12px foot. */
export function StatCard({
  icon: Icon,
  label,
  value,
  valueClass = "text-ink",
  tint = "brand",
  foot,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  valueClass?: string;
  tint?: StatTint;
  foot: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-[18px] pb-[17px] pt-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-7 flex-none items-center justify-center rounded-lg ${TINTS[tint]}`}>
          <Icon size={15} strokeWidth={1.8} aria-hidden />
        </span>
        <span className="text-[12px] font-semibold text-ink-mid">{label}</span>
      </div>
      <div className={`num mt-2.5 text-[26px] font-semibold tracking-[-0.02em] ${valueClass}`}>
        {value}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-dim">{foot}</div>
    </div>
  );
}
