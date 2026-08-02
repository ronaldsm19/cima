import type { LucideIcon } from "lucide-react";

/** Centered empty state per README: tinted icon circle, 14px/600 title, support line. */
export function EmptyState({
  icon: Icon,
  title,
  detail,
  tone = "brand",
  action,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  tone?: "brand" | "ok" | "neutral";
  action?: React.ReactNode;
}) {
  const tones = {
    brand: "bg-brand-tint text-brand",
    ok: "bg-ok-tint text-ok",
    neutral: "bg-[#EDF0EC] text-ink-strong",
  } as const;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
      <div className={`flex size-[38px] items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon size={18} strokeWidth={2} aria-hidden />
      </div>
      <div className="text-[14px] font-semibold text-ink">{title}</div>
      {detail ? <div className="max-w-[420px] text-[12.5px] text-ink-mid">{detail}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
