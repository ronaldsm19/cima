import { Folder, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ds/EmptyState";
import { Pill } from "@/components/ds/Pill";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { formatCRC0 } from "@/lib/format/currency";
import { formatDateCR } from "@/lib/format/dates";
import { listProyectos } from "@/lib/proyectos/data";

export default async function ProyectosPage() {
  const user = await requirePermission("proyectos.ver");
  const [proyectos, canCrud] = await Promise.all([
    listProyectos(),
    hasPermission(user.role, "proyectos.crud"),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink-mid">
          {proyectos.length} proyecto{proyectos.length !== 1 ? "s" : ""} · clic en una fila abre el
          formulario con sus abonos
        </span>
        {canCrud ? (
          <Link
            href="/proyectos/nuevo"
            className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden /> Nuevo proyecto
          </Link>
        ) : null}
      </div>

      {proyectos.length === 0 ? (
        <EmptyState
          icon={Folder}
          title="Todavía no hay proyectos"
          detail="Registrá el primero con el botón de arriba, o desde la ficha del cliente."
        />
      ) : (
        <div className="overflow-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <table className="w-full min-w-[920px] border-collapse">
            <thead className="bg-surface-subtle">
              <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
                <th className="px-4 text-left">Código</th>
                <th className="px-2 text-left">Cliente</th>
                <th className="px-2 text-left">Trabajo</th>
                <th className="px-2 text-left">Finca / plano</th>
                <th className="px-2 text-left">Entrega</th>
                <th className="px-2 text-right">Saldo</th>
                <th className="w-[110px] px-4 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => (
                <tr key={p.id} className="h-[52px] border-b border-line-row text-[13px] transition-colors duration-[140ms] hover:bg-row-hover">
                  <td className="num px-4 text-[12.5px] text-ink-dim">
                    <Link href={`/proyectos/${p.id}`} className="block">{p.code}</Link>
                  </td>
                  <td className="px-2">
                    <Link href={`/proyectos/${p.id}`} className="block text-[13.5px] font-semibold text-ink">
                      {p.cliente}
                    </Link>
                  </td>
                  <td className="px-2 text-ink-mid">{p.trabajo}</td>
                  <td className="num px-2 text-[12px] text-ink-dim">{p.fincaPlano}</td>
                  <td className="num px-2 text-[12.5px] text-ink-mid">
                    {p.entrega ? formatDateCR(p.entrega) : "—"}
                  </td>
                  <td className="num-right px-2 text-[13.5px] font-semibold">{formatCRC0(p.saldo)}</td>
                  <td className="px-4">
                    <Pill tone={p.pill.tone}>{p.pill.label}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
