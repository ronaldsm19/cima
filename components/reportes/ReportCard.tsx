"use client";

import type { LucideIcon } from "lucide-react";
import { Download } from "lucide-react";
import { useState } from "react";

export interface ReportFilter {
  name: string;
  label: string;
  type?: "date";
  options?: { value: string; label: string }[];
}

/** One report tile: optional filters + download button hitting the API route. */
export function ReportCard({
  icon: Icon,
  title,
  detail,
  tipo,
  filters = [],
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  tipo: string;
  filters?: ReportFilter[];
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [descargando, setDescargando] = useState(false);

  const href = () => {
    const qs = new URLSearchParams();
    for (const f of filters) {
      const v = values[f.name] ?? f.options?.[0]?.value ?? "";
      if (v) qs.set(f.name, v);
    }
    const q = qs.toString();
    return `/api/reportes/${tipo}${q ? `?${q}` : ""}`;
  };

  const descargar = () => {
    setDescargando(true);
    window.location.href = href();
    // The browser handles the download; re-enable shortly after
    setTimeout(() => setDescargando(false), 1500);
  };

  const field =
    "field-focus h-[34px] w-full rounded-[10px] border border-control-border bg-surface px-2.5 text-[13px] text-ink";

  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-brand-tint text-brand">
          <Icon size={15} strokeWidth={1.8} aria-hidden />
        </span>
        <h2 className="text-[14px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug text-ink-mid">{detail}</p>

      {filters.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {filters.map((f) => (
            <div key={f.name} className={filters.length === 1 ? "col-span-2" : ""}>
              <label
                className="mb-1 block text-[11.5px] font-semibold text-ink-dim"
                htmlFor={`${tipo}-${f.name}`}
              >
                {f.label}
              </label>
              {f.options ? (
                <select
                  id={`${tipo}-${f.name}`}
                  className={field}
                  value={values[f.name] ?? f.options[0]?.value ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                >
                  {f.options.length === 0 ? <option value="">Sin opciones</option> : null}
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${tipo}-${f.name}`}
                  type="date"
                  className={`num ${field}`}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled={descargando}
        onClick={descargar}
        className="mt-3.5 flex h-[34px] items-center justify-center gap-1.5 self-start rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
      >
        <Download size={14} strokeWidth={2} aria-hidden />
        {descargando ? "Generando…" : "Descargar Excel"}
      </button>
    </article>
  );
}
