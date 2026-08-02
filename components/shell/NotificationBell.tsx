"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { marcarLeidas } from "@/lib/actions/notificaciones";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  cuando: string;
  leida: boolean;
}

/** Header bell: unread count + dropdown with the last notifications. */
export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const noLeidas = items.filter((n) => !n.leida).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const marcarTodas = () => {
    startTransition(async () => {
      await marcarLeidas();
      router.refresh();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex size-[38px] items-center justify-center rounded-[10px] border border-line bg-app text-ink-mid transition-colors duration-[140ms] hover:bg-row-hover"
        aria-label={noLeidas > 0 ? `${noLeidas} avisos sin leer` : "Avisos"}
      >
        <Bell size={16} strokeWidth={1.8} aria-hidden />
        {noLeidas > 0 ? (
          <span className="num absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-warn px-1 text-[10.5px] font-bold text-white">
            {noLeidas}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[44px] z-50 w-[340px] overflow-hidden rounded-xl border border-line bg-surface shadow-[0_18px_40px_-16px_rgba(19,26,23,0.35)]">
          <div className="flex items-center justify-between border-b border-line-soft px-3.5 py-2.5">
            <span className="text-[13px] font-bold text-ink">Avisos</span>
            {noLeidas > 0 ? (
              <button
                type="button"
                disabled={pending}
                onClick={marcarTodas}
                className="flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
              >
                <Check size={12} strokeWidth={2.4} aria-hidden /> Marcar todo leído
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="px-3.5 py-8 text-center text-[12.5px] text-ink-mid">
              No hay avisos por ahora.
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto">
              {items.map((n) => {
                const content = (
                  <div
                    className={`border-b border-line-hair px-3.5 py-2.5 transition-colors duration-[140ms] hover:bg-row-hover ${
                      n.leida ? "" : "bg-brand-tint-soft"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-ink">{n.title}</span>
                      <span className="num flex-none text-[11px] text-ink-faint">{n.cuando}</span>
                    </div>
                    {n.body ? (
                      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-mid">{n.body}</p>
                    ) : null}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link href={n.link} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
