import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { Pill, type PillTone } from "@/components/ds/Pill";
import { requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

const ACTION_PILL: Record<string, { label: string; tone: PillTone }> = {
  CREATE: { label: "creación", tone: "neutro" },
  UPDATE: { label: "cambio", tone: "neutro" },
  DELETE: { label: "baja", tone: "vencido" },
  APPROVE: { label: "aprobación", tone: "pagado" },
  PAY: { label: "pago", tone: "pagado" },
  REVERT: { label: "reversión", tone: "pendiente" },
  ADJUST: { label: "ajuste", tone: "pendiente" },
  LOGIN: { label: "acceso", tone: "neutro" },
};

const PAGE_SIZE = 50;

/** Audit log viewer — who changed what and when (SUPER_ADMIN only by default). */
export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  await requirePermission("auditoria.ver");
  const { pagina } = await searchParams;
  const page = Math.max(1, Number(pagina ?? 1) || 1);

  const [total, rows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  if (total === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="La bitácora está vacía"
        detail="Cada aprobación, pago, abono y ajuste queda registrado acá con su autor y su fecha."
        tone="neutral"
      />
    );
  }

  const paginas = Math.ceil(total / PAGE_SIZE);
  const fmt = new Intl.DateTimeFormat("es-CR", {
    timeZone: "America/Costa_Rica",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-[12.5px] text-ink-mid">
        {total} movimiento{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""} · página{" "}
        {page} de {paginas}
      </p>

      <div className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <table className="w-full min-w-[820px] border-collapse">
          <thead className="sticky top-0 bg-surface-subtle">
            <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
              <th className="px-4 text-left">Cuándo</th>
              <th className="px-2 text-left">Quién</th>
              <th className="px-2 text-left">Acción</th>
              <th className="px-2 text-left">Qué pasó</th>
              <th className="px-4 text-left">Entidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pill = ACTION_PILL[r.action] ?? { label: r.action.toLowerCase(), tone: "neutro" as PillTone };
              return (
                <tr key={r.id} className="h-[46px] border-b border-line-row text-[13px] hover:bg-row-hover">
                  <td className="num px-4 text-[12px] text-ink-mid">{fmt.format(r.createdAt)}</td>
                  <td className="px-2 text-[12.5px]">
                    <span className="font-semibold text-ink">{r.actor.name}</span>
                  </td>
                  <td className="px-2">
                    <Pill tone={pill.tone}>{pill.label}</Pill>
                  </td>
                  <td className="px-2 text-[12.5px] text-ink">{r.summary}</td>
                  <td className="num px-4 text-[11.5px] text-ink-faint">{r.entity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {paginas > 1 ? (
        <div className="flex items-center justify-center gap-2">
          {page > 1 ? (
            <a
              href={`/auditoria?pagina=${page - 1}`}
              className="flex h-[34px] items-center rounded-[10px] border border-control-border bg-surface px-3.5 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
            >
              Anterior
            </a>
          ) : null}
          {page < paginas ? (
            <a
              href={`/auditoria?pagina=${page + 1}`}
              className="flex h-[34px] items-center rounded-[10px] border border-control-border bg-surface px-3.5 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
            >
              Siguiente
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
