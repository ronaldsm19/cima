"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SCREEN_TITLES } from "./nav";

/** 66px fixed header: screen title/subtitle left, period selector, bell and
 *  mono clock on the right. */
export function Header({
  periodSlot,
  bellSlot,
}: {
  periodSlot?: React.ReactNode;
  bellSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const screen = Object.entries(SCREEN_TITLES).find(([prefix]) =>
    pathname.startsWith(prefix),
  )?.[1] ?? { title: "Sistema interno", subtitle: "" };

  return (
    <header className="flex h-[66px] flex-none items-center gap-4 border-b border-line bg-surface px-6">
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[17px] font-bold tracking-[-0.02em] text-ink">
          {screen.title}
        </h1>
        {screen.subtitle ? (
          <p className="truncate text-[12.5px] text-ink-mid max-[960px]:hidden">
            {screen.subtitle}
          </p>
        ) : null}
      </div>
      {periodSlot}
      {bellSlot}
      <Clock />
    </header>
  );
}

function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setNow(
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="num text-[12px] text-ink-dim max-[960px]:hidden" suppressHydrationWarning>
      {now ?? ""}
    </span>
  );
}
