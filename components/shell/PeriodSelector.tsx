"use client";

import { CalendarDays } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodOptionDTO } from "@/lib/planilla/dto";

/** Header period selector — the selected period lives in the URL (?periodo=). */
export function PeriodSelector({ options }: { options: PeriodOptionDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("periodo") ?? options[0]?.slug ?? "";

  const onChange = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("periodo", slug);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <label className="flex h-[38px] max-w-[220px] items-center gap-2 rounded-[10px] border border-line bg-app px-3 max-[960px]:max-w-[150px]">
      <CalendarDays size={15} strokeWidth={1.8} className="text-ink-dim" aria-hidden />
      <span className="sr-only">Período</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 cursor-pointer truncate border-none bg-transparent text-[13px] font-semibold text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
