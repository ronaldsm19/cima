"use client";

import { Decimal } from "decimal.js";
import { ArrowLeftRight, Info, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCRC } from "@/lib/format/currency";
import { formatNumberCR, parsePositiveCR, parseRateCR } from "@/lib/format/number";
import type { PlainEngineParams } from "@/lib/payroll/params";
import { toEngineParams } from "@/lib/payroll/params";
import { brutoANeto, netoABruto, type SimuladorParams } from "@/lib/payroll/simulator";

type Modo = "bruto-neto" | "neto-bruto";

/** A dot means decimals in a rate and thousands in an amount — see parseNumberCR. */
const dec = parsePositiveCR;

export function Simulador({ params }: { params: PlainEngineParams }) {
  const [modo, setModo] = useState<Modo>("bruto-neto");
  const [monto, setMonto] = useState("450000");
  const [hijos, setHijos] = useState("0");
  const [conyuge, setConyuge] = useState(false);
  const [otros, setOtros] = useState("0");
  const [verParams, setVerParams] = useState(false);

  // Editable copies — the simulator never writes back to Configuración
  const [tasaTrabajador, setTasaTrabajador] = useState(
    String(params.tasaSem + params.tasaIvm + params.tasaBp),
  );
  const [tasaPatronal, setTasaPatronal] = useState(String(params.tasaPatronal));
  const [creditoHijo, setCreditoHijo] = useState(
    new Decimal(params.creditoFiscalHijoMensual).toFixed(0),
  );
  const [creditoConyuge, setCreditoConyuge] = useState(
    new Decimal(params.creditoFiscalConyugeMensual).toFixed(0),
  );

  const simParams: SimuladorParams = useMemo(() => {
    const base = toEngineParams({
      ...params,
      creditoFiscalHijoMensual: dec(creditoHijo).toFixed(2),
      creditoFiscalConyugeMensual: dec(creditoConyuge).toFixed(2),
    });
    return {
      ...base,
      tasaTrabajador: parseRateCR(tasaTrabajador),
      tasaPatronal: parseRateCR(tasaPatronal),
    };
  }, [params, tasaTrabajador, tasaPatronal, creditoHijo, creditoConyuge]);

  const entrada = {
    numHijos: Math.max(0, Math.min(20, Number(hijos) || 0)),
    tieneConyuge: conyuge,
    otrosRebajos: dec(otros),
  };

  const resultado = useMemo(() => {
    if (modo === "bruto-neto") {
      const r = brutoANeto({ bruto: dec(monto), ...entrada }, simParams);
      return { ...r, netoDeseado: null, netoComprobado: null, aproximado: false };
    }
    return netoABruto({ netoDeseado: dec(monto), ...entrada }, simParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, monto, hijos, conyuge, otros, simParams]);

  const field =
    "field-focus h-[38px] w-full rounded-[10px] border border-control-border bg-surface px-3 text-[13.5px] text-ink";
  const label = "mb-1.5 block text-[12px] font-semibold text-ink-mid";
  const paramField =
    "field-focus h-[34px] w-full rounded-[10px] border border-control-border bg-surface px-2.5 text-right text-[13px] text-ink";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Selector de modo */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-fit rounded-[11px] bg-[#EBEFE9] p-1">
          {(
            [
              ["bruto-neto", "Bruto → Neto"],
              ["neto-bruto", "Neto → Bruto"],
            ] as [Modo, string][]
          ).map(([key, texto]) => (
            <button
              key={key}
              type="button"
              onClick={() => setModo(key)}
              className={`h-[30px] rounded-lg px-3.5 text-[12.5px] font-semibold transition-colors duration-[140ms] ${
                modo === key ? "bg-surface text-ink shadow-[0_1px_2px_rgba(19,26,23,0.10)]" : "text-ink-mid"
              }`}
            >
              {texto}
            </button>
          ))}
        </div>
        <span className="text-[12.5px] text-ink-dim">
          Cálculo mensual, no se guarda nada. Sirve para cotizar un puesto o responderle a
          alguien cuánto le queda.
        </span>
        <button
          type="button"
          onClick={() => setVerParams((v) => !v)}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3 text-[12.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
        >
          <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
          {verParams ? "Ocultar parámetros" : "Ver parámetros"}
        </button>
      </div>

      {/* Parámetros editables (no persisten) */}
      {verParams ? (
        <section className="rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <div className="mb-2 flex items-start gap-2">
            <Info size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-ink-dim" aria-hidden />
            <p className="text-[12px] text-ink-mid">
              Estos son los parámetros vigentes del sistema. Podés cambiarlos acá para probar
              escenarios: <strong className="font-semibold text-ink">no se guardan</strong>. Para
              que rijan en la planilla, cambialos en{" "}
              <Link href="/configuracion" className="font-semibold text-brand hover:underline">
                Configuración
              </Link>
              .
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2.5 max-[960px]:grid-cols-2">
            <div>
              <label className={label} htmlFor="sim-trab">Cargas del trabajador (%)</label>
              <input id="sim-trab" inputMode="decimal" className={paramField}
                value={tasaTrabajador} onChange={(e) => setTasaTrabajador(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="sim-patr">Cargas patronales (%)</label>
              <input id="sim-patr" inputMode="decimal" className={paramField}
                value={tasaPatronal} onChange={(e) => setTasaPatronal(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="sim-ch">Crédito por hijo (₡/mes)</label>
              <input id="sim-ch" inputMode="decimal" className={paramField}
                value={creditoHijo} onChange={(e) => setCreditoHijo(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="sim-cc">Crédito por cónyuge (₡/mes)</label>
              <input id="sim-cc" inputMode="decimal" className={paramField}
                value={creditoConyuge} onChange={(e) => setCreditoConyuge(e.target.value)} />
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {simParams.isrBrackets.map((b, i) => (
              <span key={i} className="num rounded-md bg-app px-2 py-0.5 text-[11px] text-ink-mid">
                {b.limiteSuperior
                  ? `${formatCRC(b.limiteInferior, { decimals: 0 })}–${formatCRC(b.limiteSuperior, { decimals: 0 })}`
                  : `más de ${formatCRC(b.limiteInferior, { decimals: 0 })}`}{" "}
                → {formatNumberCR(b.tasaPct.toString())} %
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid min-h-0 grid-cols-[1fr_420px] items-start gap-4 max-[960px]:grid-cols-1">
        {/* Entradas */}
        <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <header className="flex h-[54px] items-center gap-2 border-b border-line-soft px-4">
            <ArrowLeftRight size={15} strokeWidth={1.8} className="text-ink-dim" aria-hidden />
            <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">
              {modo === "bruto-neto" ? "Datos del salario bruto" : "Meta del empleado"}
            </h2>
          </header>
          <div className="grid grid-cols-2 gap-3.5 p-4">
            <div className="col-span-2">
              <label className={label} htmlFor="sim-monto">
                {modo === "bruto-neto" ? "Salario bruto mensual (₡)" : "Salario neto deseado (₡)"}
              </label>
              <input
                id="sim-monto"
                inputMode="decimal"
                autoFocus
                className={`num text-right ${field}`}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
            <div>
              <label className={label} htmlFor="sim-hijos">Cantidad de hijos</label>
              <input id="sim-hijos" inputMode="numeric" className={`num text-right ${field}`}
                value={hijos} onChange={(e) => setHijos(e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="sim-otros">Otros rebajos (₡)</label>
              <input id="sim-otros" inputMode="decimal" className={`num text-right ${field}`}
                value={otros} onChange={(e) => setOtros(e.target.value)} />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" className="size-4 accent-[#0E6B4E]" checked={conyuge}
                onChange={(e) => setConyuge(e.target.checked)} />
              Aplicar crédito fiscal por cónyuge
            </label>
            <p className="col-span-2 text-[11.5px] text-ink-faint">
              &quot;Otros rebajos&quot; cubre lo que la planilla real puede llevar aparte:
              solidarista, pensión alimenticia, embargos o adelantos.
            </p>
          </div>
        </section>

        {/* Resultado */}
        <aside className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
          <h2 className="mb-2 text-[14.5px] font-bold tracking-[-0.01em] text-ink">
            {modo === "bruto-neto" ? "Resultado del análisis" : "Resultado para el patrono"}
          </h2>

          {modo === "neto-bruto" ? (
            <>
              <Row label="Salario neto deseado" valor={formatCRC(resultado.netoDeseado ?? 0)} />
              <Row label="Salario bruto requerido" valor={formatCRC(resultado.bruto)} destacado />
            </>
          ) : (
            <Row label="Salario bruto" valor={formatCRC(resultado.bruto)} />
          )}

          <Row
            label="Cargas sociales del trabajador"
            nota={`${formatNumberCR(simParams.tasaTrabajador.toString())} %`}
            valor={`−${formatCRC(resultado.cargasTrabajador)}`}
            tono="resta"
          />
          <Row
            label="Impuesto sobre la renta"
            nota="escala mensual"
            valor={resultado.renta.gt(0) ? `−${formatCRC(resultado.renta)}` : "—"}
            tono="resta"
          />
          {resultado.creditosAplicados.gt(0) ? (
            <Row
              label="Créditos familiares aplicados"
              valor={`+${formatCRC(resultado.creditosAplicados)}`}
              tono="suma"
            />
          ) : null}
          {resultado.otrosRebajos.gt(0) ? (
            <Row label="Otros rebajos" valor={`−${formatCRC(resultado.otrosRebajos)}`} tono="resta" />
          ) : null}

          <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-4 py-3">
            <span className="text-[13px] font-semibold text-ink">
              {modo === "bruto-neto" ? "Salario neto mensual" : "Neto comprobado"}
            </span>
            <span className="num text-[21px] font-bold text-brand">
              {formatCRC(modo === "bruto-neto" ? resultado.neto : (resultado.netoComprobado ?? resultado.neto))}
            </span>
          </div>

          <div className="mt-4 border-t border-line-soft pt-3">
            <div className="mb-1 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-dim">
              Costo para la oficina
            </div>
            <Row
              label="Cargas patronales"
              nota={`${formatNumberCR(simParams.tasaPatronal.toString())} %`}
              valor={formatCRC(resultado.cargasPatronales)}
            />
            <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-app px-4 py-3">
              <span className="text-[13px] font-semibold text-ink">
                {modo === "bruto-neto" ? "Costo total del empleado" : "Total que debe sacar el patrono"}
              </span>
              <span className="num text-[17px] font-bold text-ink">
                {formatCRC(resultado.costoTotalPatrono)}
              </span>
            </div>
          </div>

          {resultado.aproximado ? (
            <p className="mt-3 text-[11.5px] text-warn-text">
              El bruto se ajustó numéricamente porque los créditos dejan el impuesto en cero; el
              neto comprobado es exacto.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  nota,
  valor,
  tono,
  destacado,
}: {
  label: string;
  nota?: string;
  valor: string;
  tono?: "suma" | "resta";
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-hair py-2 last:border-b-0">
      <span className="text-[12.5px] text-ink-mid">
        {label}
        {nota ? <span className="ml-1.5 text-[11px] text-ink-faint">{nota}</span> : null}
      </span>
      <span
        className={`num ${destacado ? "text-[15px] font-bold text-ink" : "text-[13px]"} ${
          tono === "suma" ? "text-ok" : tono === "resta" ? "text-ink-mid" : "text-ink"
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
