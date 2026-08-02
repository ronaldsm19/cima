"use client";

import { AlertTriangle, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createEmployee, updateEmployee } from "@/lib/actions/empleados";
import {
  SALARY_UNIT_SUFFIX,
  validateEmployeeForm,
  type EmployeeFormValues,
} from "@/lib/empleados/form";
import { formatCRC } from "@/lib/format/currency";
import { todayCR } from "@/lib/format/dates";
import type { PlainEngineParams } from "@/lib/payroll/params";
import { computeLine } from "@/lib/planilla/compute";

const EMPTY: EmployeeFormValues = {
  nombre: "",
  cedula: "",
  puesto: "",
  modalidad: "QUINCENAL",
  salarioBase: "",
  ingreso: todayCR(),
  iban: "",
  telefono: "",
  solidarista: "",
  embargo: "",
};

export interface EmployeeModalProps {
  params: PlainEngineParams;
  /** Present → edit mode; absent → alta. */
  initial?: EmployeeFormValues & { employeeId: string };
  onClose: () => void;
  /** Called with the saved employee id. */
  onSaved?: (employeeId: string) => void;
}

/** Modal de alta/edición per captura 04, with the live "Neto estimado del período". */
export function EmployeeModal({ params, initial, onClose, onSaved }: EmployeeModalProps) {
  const router = useRouter();
  const [values, setValues] = useState<EmployeeFormValues>(initial ?? EMPTY);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const edit = Boolean(initial);

  const set = (patch: Partial<EmployeeFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrorFields([]);
    setErrorMsg(null);
  };

  // Neto estimado en vivo — same pure engine as the planilla
  const netoEstimado = useMemo(() => {
    const salario = values.salarioBase.replace(/\./g, "").replace(",", ".");
    if (!(Number(salario) > 0)) return null;
    const adjustments = [];
    if (Number(values.solidarista) > 0) {
      adjustments.push({
        type: "SOLIDARISTA" as const,
        mode: "PORCENTAJE_BRUTO" as const,
        ratePct: Number(values.solidarista),
      });
    }
    const embargo = values.embargo.replace(/\./g, "").replace(",", ".");
    if (Number(embargo) > 0) {
      adjustments.push({ type: "EMBARGO" as const, mode: "MONTO_FIJO" as const, amount: embargo });
    }
    try {
      const r = computeLine(
        { modalidad: values.modalidad, salarioBase: salario, numHijos: 0, tieneConyuge: false, adjustments },
        0,
        "0",
        params,
      );
      return r.neto;
    } catch {
      return null;
    }
  }, [values, params]);

  const submit = () => {
    const invalid = validateEmployeeForm(values);
    if (invalid) {
      setErrorFields(invalid.fields);
      setErrorMsg(invalid.message);
      return;
    }
    startTransition(async () => {
      const res = edit
        ? await updateEmployee(initial!.employeeId, values)
        : await createEmployee(values);
      if (!res.ok) {
        setErrorFields(res.fields ?? []);
        setErrorMsg(res.error);
        return;
      }
      toast.success(edit ? "Cambios guardados." : `${values.nombre} entra en la planilla del período actual.`);
      router.refresh();
      onSaved?.(res.employeeId);
      onClose();
    });
  };

  const field = (name: string) =>
    `field-focus h-[38px] w-full rounded-[10px] border bg-surface px-3 text-[13.5px] text-ink placeholder:text-ink-faint ${
      errorFields.includes(name)
        ? "border-[#E5A99E] bg-bad-tint-soft text-bad-text"
        : "border-control-border"
    }`;
  const label = "mb-1.5 block text-[12px] font-semibold text-ink-mid";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,30,25,0.42)] p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={edit ? "Editar empleado" : "Agregar empleado"}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_32px_70px_-24px_rgba(9,20,15,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-start gap-3 border-b border-line-soft p-5">
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-tint text-brand">
            <UserPlus size={18} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
              {edit ? "Editar empleado" : "Agregar empleado"}
            </h2>
            <p className="text-[12.5px] text-ink-mid">
              {edit
                ? "Un cambio de salario o modalidad abre un contrato nuevo; el historial no se toca."
                : "Entra en la planilla del período actual apenas se guarde."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 flex-none items-center justify-center rounded-lg border border-control-border text-ink-mid transition-colors duration-[140ms] hover:bg-app"
            aria-label="Cerrar"
          >
            <X size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {/* Cuerpo */}
        <form
          className="grid flex-1 grid-cols-2 gap-3.5 overflow-y-auto p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="col-span-2">
            <label className={label} htmlFor="emp-nombre">Nombre completo</label>
            <input id="emp-nombre" autoFocus className={field("nombre")} placeholder="Nombre y dos apellidos"
              value={values.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="emp-cedula">Cédula</label>
            <input id="emp-cedula" className={`num ${field("cedula")}`} placeholder="1-0000-0000"
              value={values.cedula} onChange={(e) => set({ cedula: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="emp-puesto">Puesto</label>
            <input id="emp-puesto" className={field("puesto")} placeholder="Cadenero"
              value={values.puesto} onChange={(e) => set({ puesto: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="emp-modalidad">Modalidad de pago</label>
            <select id="emp-modalidad" className={field("modalidad")}
              value={values.modalidad}
              onChange={(e) => set({ modalidad: e.target.value as EmployeeFormValues["modalidad"] })}>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="emp-salario">
              Salario base ({SALARY_UNIT_SUFFIX[values.modalidad]})
            </label>
            <input id="emp-salario" inputMode="decimal" className={`num text-right ${field("salarioBase")}`} placeholder="0"
              value={values.salarioBase} onChange={(e) => set({ salarioBase: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="emp-ingreso">Fecha de ingreso</label>
            <input id="emp-ingreso" type="date" className={`num ${field("ingreso")}`}
              value={values.ingreso} onChange={(e) => set({ ingreso: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="emp-iban">Cuenta IBAN</label>
            <input id="emp-iban" className={`num ${field("iban")}`} placeholder="CR00 0000 0000 0000 0000 00"
              value={values.iban} onChange={(e) => set({ iban: e.target.value })} />
          </div>
          {edit ? (
            <div>
              <label className={label} htmlFor="emp-telefono">Teléfono</label>
              <input id="emp-telefono" className={`num ${field("telefono")}`} placeholder="8888-8888"
                value={values.telefono ?? ""} onChange={(e) => set({ telefono: e.target.value })} />
            </div>
          ) : null}

          <div className="col-span-2">
            <div className={label}>Deducciones opcionales</div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="emp-solid">Solidarista (%)</label>
                <input id="emp-solid" inputMode="decimal" className={`num text-right ${field("solidarista")}`} placeholder="0"
                  value={values.solidarista} onChange={(e) => set({ solidarista: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-ink-dim" htmlFor="emp-embargo">Pensión alimenticia (₡ por período)</label>
                <input id="emp-embargo" inputMode="decimal" className={`num text-right ${field("embargo")}`} placeholder="0"
                  value={values.embargo} onChange={(e) => set({ embargo: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Neto estimado en vivo */}
          <div className="col-span-2 flex items-center justify-between rounded-xl border border-brand-tint-border bg-brand-tint-soft px-4 py-3">
            <span className="text-[13px] font-semibold text-ink">Neto estimado del período</span>
            <span className="num text-[17px] font-bold text-brand">
              {netoEstimado ? formatCRC(netoEstimado) : "—"}
            </span>
          </div>

          {errorMsg ? (
            <div className="col-span-2 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2.5 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={15} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>
                {errorMsg.startsWith("Hace falta") ? (
                  <strong className="font-bold">Faltan datos. </strong>
                ) : null}
                {errorMsg}
              </span>
            </div>
          ) : null}
        </form>

        {/* Acciones */}
        <div className="flex justify-end gap-2 border-t border-line-soft p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] rounded-[10px] border border-control-border bg-surface px-4 text-[13.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="h-[38px] rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none"
          >
            {pending ? "Guardando…" : edit ? "Guardar cambios" : "Guardar empleado"}
          </button>
        </div>
      </div>
    </div>
  );
}
