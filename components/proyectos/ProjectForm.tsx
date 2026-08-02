"use client";

import { Decimal } from "decimal.js";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ds/Pill";
import { AssignmentsCard } from "@/components/proyectos/AssignmentsCard";
import {
  createProject,
  registrarAbono,
  registrarGasto,
  updateProject,
} from "@/lib/actions/proyectos";
import { formatCRC } from "@/lib/format/currency";
import { formatDateCR, todayCR } from "@/lib/format/dates";
import type { ProyectoDTO } from "@/lib/proyectos/data";
import {
  PROJECT_TYPE_OPTIONS,
  validateProjectForm,
  type ProjectFormValues,
} from "@/lib/proyectos/form";
import { PROJECT_STATUS } from "@/lib/projects/status";

type Mode =
  | { kind: "edit"; dto: ProyectoDTO }
  | {
      kind: "create";
      form: ProjectFormValues;
      clientes: { id: string; nombre: string }[];
      permisos: ProyectoDTO["permisos"];
    };

const toDec = (raw: string): Decimal => {
  try {
    const d = new Decimal(raw.replace(/\./g, "").replace(",", ".") || "0");
    return d.isFinite() && d.gte(0) ? d : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
};

export function ProjectForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const dto = mode.kind === "edit" ? mode.dto : null;
  const clientes = mode.kind === "edit" ? mode.dto.clientes : mode.clientes;
  const permisos = mode.kind === "edit" ? mode.dto.permisos : mode.permisos;

  const [values, setValues] = useState<ProjectFormValues>(
    mode.kind === "edit" ? mode.dto.form : mode.form,
  );
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Abono capture row
  const [abono, setAbono] = useState({ fecha: todayCR(), referencia: "", monto: "" });
  const [abonoError, setAbonoError] = useState<string | null>(null);
  // Gasto capture row
  const [gasto, setGasto] = useState({ fecha: todayCR(), tipo: "GASTO" as "GASTO" | "VIATICO", descripcion: "", monto: "" });

  const set = (patch: Partial<ProjectFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrorFields([]);
    setErrorMsg(null);
  };

  // ── Saldo en vivo ──────────────────────────────────────────────────────────
  const abonado = useMemo(() => new Decimal(dto?.abonado ?? "0"), [dto]);
  const gastosTotal = useMemo(() => new Decimal(dto?.gastosTotal ?? "0"), [dto]);
  const monto = toDec(values.monto);
  const primaPct = toDec(values.primaPct);
  const primaMonto = monto.mul(primaPct).div(100).toDecimalPlaces(2);
  const saldo = Decimal.max(new Decimal(0), monto.minus(abonado));
  const primaCubierta = abonado.gte(primaMonto) && primaMonto.gt(0);
  const pctCobrado = monto.isZero()
    ? 0
    : Math.min(100, Math.round(abonado.div(monto).mul(100).toNumber()));
  const rentabilidad = monto.minus(gastosTotal);

  const guardar = () => {
    const invalid = validateProjectForm(values);
    if (invalid) {
      setErrorFields(invalid.fields);
      setErrorMsg(invalid.message);
      return;
    }
    startTransition(async () => {
      const res = dto ? await updateProject(dto.id, values) : await createProject(values);
      if (!res.ok) {
        setErrorFields(res.fields ?? []);
        setErrorMsg(res.error);
        return;
      }
      toast.success(dto ? "Proyecto guardado." : `Proyecto ${res.code} creado.`);
      if (!dto) router.push(`/proyectos/${res.projectId}`);
      router.refresh();
    });
  };

  const registrarUnAbono = () => {
    if (!dto) return;
    setAbonoError(null);
    startTransition(async () => {
      const res = await registrarAbono(dto.id, abono);
      if (!res.ok) {
        setAbonoError(res.error);
        return;
      }
      toast.success("Abono registrado.");
      setAbono({ fecha: todayCR(), referencia: "", monto: "" });
      router.refresh();
    });
  };

  const registrarUnGasto = () => {
    if (!dto) return;
    startTransition(async () => {
      const res = await registrarGasto(dto.id, gasto);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(gasto.tipo === "VIATICO" ? "Viático registrado." : "Gasto registrado.");
      setGasto({ fecha: todayCR(), tipo: "GASTO", descripcion: "", monto: "" });
      router.refresh();
    });
  };

  const field = (name: string) =>
    `field-focus h-[38px] w-full rounded-[10px] border bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-faint ${
      errorFields.includes(name)
        ? "border-[#E5A99E] bg-bad-tint-soft text-bad-text"
        : "border-control-border"
    }`;
  const label = "mb-1.5 block text-[12px] font-semibold text-ink-mid";
  const readOnly = !permisos.crud;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1fr_372px] items-start gap-4 max-[960px]:grid-cols-1">
      {/* ── Formulario ── */}
      <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <header className="flex h-[54px] items-center gap-3 border-b border-line-soft px-4">
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Datos del proyecto</h2>
          <span className="num flex h-[23px] items-center rounded-full bg-[#EDF2EF] px-2.5 text-[11.5px] font-bold text-[#4A6B5C]">
            {dto?.code ?? "código al guardar"}
          </span>
          {dto ? <Pill tone={dto.pill.tone}>{dto.pill.label}</Pill> : null}
        </header>

        <fieldset disabled={readOnly} className="grid grid-cols-2 gap-3.5 p-4">
          <div>
            <label className={label} htmlFor="pf-cliente">Cliente</label>
            <select id="pf-cliente" className={field("clientId")} value={values.clientId}
              onChange={(e) => set({ clientId: e.target.value })}>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pf-tipo">Tipo de trabajo</label>
            <select id="pf-tipo" className={field("tipo")} value={values.tipo}
              onChange={(e) => set({ tipo: e.target.value as ProjectFormValues["tipo"] })}>
              {PROJECT_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="pf-finca">Número de finca</label>
            <input id="pf-finca" className={`num ${field("finca")}`} placeholder="Finca 0-00000000"
              value={values.finca} onChange={(e) => set({ finca: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="pf-entrega">Fecha de entrega</label>
            <input id="pf-entrega" type="date" className={`num ${field("entrega")}`}
              value={values.entrega} onChange={(e) => set({ entrega: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="pf-monto">Monto acordado (₡)</label>
            <input id="pf-monto" inputMode="decimal" className={`num text-right ${field("monto")}`} placeholder="0"
              value={values.monto} onChange={(e) => set({ monto: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="pf-prima">Prima pactada (%)</label>
            <input id="pf-prima" inputMode="decimal" className={`num text-right ${field("primaPct")}`} placeholder="30"
              value={values.primaPct} onChange={(e) => set({ primaPct: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="pf-plano">Número de plano</label>
            <input id="pf-plano" className={`num ${field("plano")}`} placeholder="C-0000000"
              value={values.plano} onChange={(e) => set({ plano: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="pf-estado">Estado</label>
            <select id="pf-estado" className={field("estado")} value={values.estado}
              onChange={(e) => set({ estado: e.target.value as ProjectFormValues["estado"] })}>
              {Object.entries(PROJECT_STATUS).map(([value, s]) => (
                <option key={value} value={value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="pf-desc">Descripción del trabajo</label>
            <input id="pf-desc" className={field("descripcion")} placeholder="Replanteo de lotes, levantamiento…"
              value={values.descripcion} onChange={(e) => set({ descripcion: e.target.value })} />
          </div>

          {errorMsg ? (
            <div className="col-span-2 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2.5 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>
                {errorMsg.startsWith("Hace falta") ? <strong className="font-bold">Faltan datos. </strong> : null}
                {errorMsg}
              </span>
            </div>
          ) : null}
        </fieldset>

        {/* ── Registro de abonos ── */}
        {dto ? (
          <div className="border-t border-line-soft p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[13.5px] font-bold text-ink">Registro de abonos</h3>
              <span className="num flex h-[20px] items-center rounded-full bg-[#EDF2EF] px-2 text-[11px] font-bold text-[#4A6B5C]">
                {dto.abonos.length} registrado{dto.abonos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {dto.abonos.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[#D8DFD7] bg-row-hover px-4 py-5 text-center text-[12.5px] text-ink-mid">
                Registrá la prima pactada de{" "}
                <span className="num font-semibold text-ink">{formatCRC(primaMonto)}</span> como
                primer abono.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="h-8 border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
                    <th className="text-left">Fecha</th>
                    <th className="text-left">Referencia</th>
                    <th className="text-right">Monto</th>
                    <th className="text-right">Saldo tras abono</th>
                  </tr>
                </thead>
                <tbody>
                  {dto.abonos.map((a) => (
                    <tr key={a.id} className="h-10 border-b border-line-hair text-[13px]">
                      <td className="num text-[12.5px]">{formatDateCR(a.fecha)}</td>
                      <td className="text-[12.5px] text-ink-mid">{a.referencia}</td>
                      <td className="num-right text-ok">{formatCRC(a.monto)}</td>
                      <td className="num-right text-ink-dim">{formatCRC(a.saldoTras)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {permisos.abonos && saldo.gt(0) ? (
              <div className="mt-3 grid grid-cols-[150px_1fr_140px_auto] items-end gap-2.5 max-[960px]:grid-cols-2">
                <div>
                  <label className={label} htmlFor="ab-fecha">Fecha del abono</label>
                  <input id="ab-fecha" type="date" className={`num ${field("_ab")}`}
                    value={abono.fecha} onChange={(e) => setAbono((a) => ({ ...a, fecha: e.target.value }))} />
                </div>
                <div>
                  <label className={label} htmlFor="ab-ref">Referencia</label>
                  <input id="ab-ref" className={field("_ab")} placeholder="SINPE / transferencia"
                    value={abono.referencia} onChange={(e) => setAbono((a) => ({ ...a, referencia: e.target.value }))} />
                </div>
                <div>
                  <label className={label} htmlFor="ab-monto">Monto (₡)</label>
                  <input id="ab-monto" inputMode="decimal" className={`num text-right ${field("_ab")} ${abonoError ? "border-[#E5A99E] bg-bad-tint-soft text-bad-text" : ""}`}
                    placeholder="0,00"
                    value={abono.monto} onChange={(e) => { setAbono((a) => ({ ...a, monto: e.target.value })); setAbonoError(null); }} />
                </div>
                <button type="button" disabled={pending} onClick={registrarUnAbono}
                  className="h-[38px] rounded-[10px] bg-brand px-4 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none">
                  Registrar abono
                </button>
              </div>
            ) : null}
            {abonoError ? (
              <div className="mt-2 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
                <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
                <span>{abonoError}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Gastos y viáticos ── */}
        {dto && permisos.gastos ? (
          <div className="border-t border-line-soft p-4">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-[13.5px] font-bold text-ink">Gastos y viáticos</h3>
              <span className="num flex h-[20px] items-center rounded-full bg-[#EDF2EF] px-2 text-[11px] font-bold text-[#4A6B5C]">
                {formatCRC(gastosTotal, { decimals: 0 })}
              </span>
            </div>

            {dto.gastos.length === 0 ? (
              <div className="rounded-[10px] border border-dashed border-[#D8DFD7] bg-row-hover px-4 py-4 text-center text-[12.5px] text-ink-mid">
                Registrá gasolina, viáticos o materiales para conocer la rentabilidad real del trabajo.
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="h-8 border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
                    <th className="text-left">Fecha</th>
                    <th className="text-left">Tipo</th>
                    <th className="text-left">Descripción</th>
                    <th className="text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {dto.gastos.map((g) => (
                    <tr key={g.id} className="h-10 border-b border-line-hair text-[13px]">
                      <td className="num text-[12.5px]">{formatDateCR(g.fecha)}</td>
                      <td className="text-[12.5px] text-ink-mid">{g.tipo === "VIATICO" ? "Viático" : "Gasto"}</td>
                      <td className="text-[12.5px]">{g.descripcion}</td>
                      <td className="num-right text-bad-text">−{formatCRC(g.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-3 grid grid-cols-[150px_120px_1fr_140px_auto] items-end gap-2.5 max-[960px]:grid-cols-2">
              <div>
                <label className={label} htmlFor="ga-fecha">Fecha</label>
                <input id="ga-fecha" type="date" className={`num ${field("_ga")}`}
                  value={gasto.fecha} onChange={(e) => setGasto((g) => ({ ...g, fecha: e.target.value }))} />
              </div>
              <div>
                <label className={label} htmlFor="ga-tipo">Tipo</label>
                <select id="ga-tipo" className={field("_ga")} value={gasto.tipo}
                  onChange={(e) => setGasto((g) => ({ ...g, tipo: e.target.value as "GASTO" | "VIATICO" }))}>
                  <option value="GASTO">Gasto</option>
                  <option value="VIATICO">Viático</option>
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ga-desc">Descripción</label>
                <input id="ga-desc" className={field("_ga")} placeholder="Gasolina, peón extra, copias…"
                  value={gasto.descripcion} onChange={(e) => setGasto((g) => ({ ...g, descripcion: e.target.value }))} />
              </div>
              <div>
                <label className={label} htmlFor="ga-monto">Monto (₡)</label>
                <input id="ga-monto" inputMode="decimal" className={`num text-right ${field("_ga")}`} placeholder="0,00"
                  value={gasto.monto} onChange={(e) => setGasto((g) => ({ ...g, monto: e.target.value }))} />
              </div>
              <button type="button" disabled={pending} onClick={registrarUnGasto}
                className="h-[38px] rounded-[10px] border border-control-border bg-surface px-4 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app disabled:cursor-not-allowed disabled:text-ink-faint">
                Registrar gasto
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Equipo asignado ── */}
        {dto ? (
          <AssignmentsCard
            projectId={dto.id}
            asignados={dto.asignados}
            disponibles={dto.empleadosDisponibles}
            canEdit={permisos.crud}
          />
        ) : null}
      </section>

      {/* ── Panel Saldo en vivo ── */}
      <aside className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)] max-[960px]:w-full">
        <h3 className="mb-2 text-[14.5px] font-bold tracking-[-0.01em] text-ink">Saldo en vivo</h3>
        <PanelRow label="Monto acordado" value={formatCRC(monto)} />
        <PanelRow
          label={`Prima pactada · ${primaPct.toString().replace(".", ",")} %`}
          value={formatCRC(primaMonto)}
        />
        <PanelRow label="Abonado a la fecha" value={formatCRC(abonado)} tone="ok" />
        <PanelRow
          label="Prima cubierta"
          value={primaCubierta ? "sí" : "no"}
          tone={primaCubierta ? "ok" : "warn"}
        />
        {gastosTotal.gt(0) ? (
          <>
            <PanelRow label="Gastos y viáticos" value={`−${formatCRC(gastosTotal)}`} tone="bad" />
            <PanelRow label="Rentabilidad estimada" value={formatCRC(rentabilidad)} />
          </>
        ) : null}

        <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-4 py-3">
          <span className="text-[13px] font-semibold text-ink">Saldo pendiente</span>
          <span className="num text-[21px] font-bold text-brand">{formatCRC(saldo)}</span>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EDF0EC]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1B9E70] to-[#0E6B4E] transition-[width] duration-300"
            style={{ width: `${pctCobrado}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-dim">
          <span className="num">{pctCobrado}% cobrado</span>
          <span className="num">
            {values.entrega
              ? `Entrega ${formatDateCR(values.entrega)}`
              : "Sin fecha de entrega"}
          </span>
        </div>

        {permisos.crud ? (
          <button type="button" disabled={pending} onClick={guardar}
            className="mt-4 h-[38px] rounded-[10px] bg-brand text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none">
            {pending ? "Guardando…" : "Guardar proyecto"}
          </button>
        ) : null}
        <Link
          href={values.clientId ? `/clientes/${values.clientId}` : "/clientes"}
          className="mt-2 flex h-[38px] items-center justify-center rounded-[10px] border border-control-border bg-surface text-[13.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
        >
          Ver cliente
        </Link>
      </aside>
    </div>
  );
}

function PanelRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-hair py-2 last:border-b-0">
      <span className="text-[12.5px] text-ink-mid">{label}</span>
      <span
        className={`num text-[13px] ${
          tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn-text" : tone === "bad" ? "text-bad-text" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
