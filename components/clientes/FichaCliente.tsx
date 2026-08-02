"use client";

import { Building2, Pencil, Plus, UserMinus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ds/Pill";
import { ClientModal } from "@/components/clientes/ClientModal";
import { deactivateClient } from "@/lib/actions/clientes";
import type { FichaClienteDTO } from "@/lib/clientes/data";
import { formatCRC0 } from "@/lib/format/currency";

/** Pantalla 5 · Ficha de cliente — header + cajetín + tabla de proyectos. */
export function FichaCliente({ ficha }: { ficha: FichaClienteDTO }) {
  const router = useRouter();
  const [editModal, setEditModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const darDeBaja = () => {
    if (!window.confirm(`¿Dar de baja a ${ficha.nombre}? Solo se puede si no tiene proyectos abiertos.`)) return;
    startTransition(async () => {
      const res = await deactivateClient(ficha.id);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${ficha.nombre} quedó dado de baja.`);
        router.push(res.clientId ? `/clientes/${res.clientId}` : "/clientes");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {/* Encabezado */}
      <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="flex items-center gap-4 border-b border-line-soft px-5 py-[18px]">
          <span className="flex size-[46px] flex-none items-center justify-center rounded-xl bg-[#EDF2EF] text-[#3E6B58]">
            <Building2 size={20} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate text-[19px] font-bold tracking-[-0.02em] text-ink">{ficha.nombre}</h2>
            <div className="mt-0.5 truncate text-[13px] text-ink-mid">
              {[ficha.contacto, ficha.email, ficha.telefono ? `tel. ${ficha.telefono}` : null]
                .filter(Boolean)
                .join(" · ") || "Sin datos de contacto"}
            </div>
          </div>
          <div className="flex flex-none items-center gap-4">
            {ficha.permisos.crud ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditModal(true)}
                  className="flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
                >
                  <Pencil size={13} strokeWidth={2} aria-hidden /> Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={darDeBaja}
                  className="flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-bad-text transition-colors duration-[140ms] hover:border-bad-border hover:bg-bad-tint-soft disabled:cursor-not-allowed disabled:text-ink-faint"
                >
                  <UserMinus size={13} strokeWidth={2} aria-hidden /> Dar de baja
                </button>
              </div>
            ) : null}
            <div className="text-right leading-tight">
              <div className="text-[11.5px] font-semibold text-ink-dim">Saldo pendiente</div>
              <div className={`num text-[22px] font-bold ${ficha.tieneVencidos ? "text-bad-text" : "text-ink"}`}>
                {formatCRC0(ficha.saldoPendiente)}
              </div>
            </div>
          </div>
        </div>
        {/* Cajetín */}
        <div className="grid grid-cols-4 divide-x divide-line-soft max-[960px]:grid-cols-2">
          <CajetinCell
            label={ficha.kind === "JURIDICA" ? "Cédula jurídica" : "Cédula"}
            value={<span className="num">{ficha.cedula}</span>}
          />
          <CajetinCell
            label="Teléfono"
            value={ficha.telefono ? <span className="num">{ficha.telefono}</span> : "—"}
          />
          <CajetinCell label="Contratado" value={<span className="num">{formatCRC0(ficha.contratado)}</span>} />
          <CajetinCell
            label="Abonado"
            value={<span className="num text-ok">{formatCRC0(ficha.abonado)}</span>}
          />
        </div>
      </section>

      {/* Tabla de proyectos */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <header className="flex h-[54px] flex-none items-center justify-between border-b border-line-soft px-4">
          <h3 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
            Proyectos
            <span className="ml-2 text-[12px] font-normal text-ink-dim">
              {ficha.proyectos.length} registrado{ficha.proyectos.length !== 1 ? "s" : ""}
            </span>
          </h3>
          {ficha.permisos.crud ? (
            <Link
              href={`/proyectos/nuevo?cliente=${ficha.id}`}
              className="flex h-[34px] items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover"
            >
              <Plus size={14} strokeWidth={2.2} aria-hidden /> Nuevo proyecto
            </Link>
          ) : null}
        </header>
        {ficha.proyectos.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-12 text-center">
            <div className="text-[14px] font-semibold text-ink">Todavía no hay proyectos</div>
            <div className="text-[12.5px] text-ink-mid">
              Registrá el primero con el botón de arriba; el saldo se calcula solo con cada abono.
            </div>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[920px] border-collapse">
              <thead className="bg-surface-subtle">
                <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
                  <th className="px-4 text-left">Código</th>
                  <th className="px-2 text-left">Trabajo</th>
                  <th className="px-2 text-left">Finca / plano</th>
                  <th className="px-2 text-right">Contratado</th>
                  <th className="px-2 text-right">Abonado</th>
                  <th className="px-2 text-right">Saldo</th>
                  <th className="w-[110px] px-4 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {ficha.proyectos.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/proyectos/${p.id}`)}
                    className="h-[52px] cursor-pointer border-b border-line-row text-[13px] transition-colors duration-[140ms] hover:bg-row-hover"
                  >
                    <td className="num px-4 text-[12.5px] text-ink-dim">{p.code}</td>
                    <td className="px-2 text-[13.5px] font-semibold text-ink">{p.trabajo}</td>
                    <td className="num px-2 text-[12px] text-ink-dim">{p.fincaPlano}</td>
                    <td className="num-right px-2">{formatCRC0(p.contratado)}</td>
                    <td className="num-right px-2 text-ok-text">{formatCRC0(p.abonado)}</td>
                    <td className="num-right px-2 text-[13.5px] font-semibold">{formatCRC0(p.saldo)}</td>
                    <td className="px-4">
                      <Pill tone={p.pill.tone}>{p.pill.label}</Pill>
                    </td>
                  </tr>
                ))}
                <tr className="h-[52px] bg-surface-subtle text-[12.5px] font-bold">
                  <td className="px-4" colSpan={3}>
                    Total
                  </td>
                  <td className="num-right px-2">{formatCRC0(ficha.contratado)}</td>
                  <td className="num-right px-2 text-ok-text">{formatCRC0(ficha.abonado)}</td>
                  <td className="num-right px-2 text-[15px]">{formatCRC0(ficha.saldoPendiente)}</td>
                  <td className="px-4" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editModal ? <ClientModal initial={ficha.form} onClose={() => setEditModal(false)} /> : null}
    </div>
  );
}

function CajetinCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="px-5 pb-4 pt-3.5">
      <div className="text-[11.5px] font-semibold text-ink-dim">{label}</div>
      <div className="mt-1 text-[14.5px] text-ink">{value}</div>
    </div>
  );
}
