"use client";

import { AlertTriangle, Building2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useModalKeys } from "@/components/ds/useModalKeys";
import { createClient, updateClient } from "@/lib/actions/clientes";
import {
  validateClientForm,
  type ClientFormValues,
} from "@/lib/clientes/form";

const EMPTY: ClientFormValues = {
  kind: "JURIDICA",
  nombre: "",
  cedula: "",
  contacto: "",
  telefono: "",
  email: "",
  notas: "",
};

export function ClientModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ClientFormValues & { clientId: string };
  onClose: () => void;
  onSaved?: (clientId: string) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ClientFormValues>(initial ?? EMPTY);
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const edit = Boolean(initial);

  const set = (patch: Partial<ClientFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrorFields([]);
    setErrorMsg(null);
  };

  const submit = () => {
    const invalid = validateClientForm(values);
    if (invalid) {
      setErrorFields(invalid.fields);
      setErrorMsg(invalid.message);
      return;
    }
    startTransition(async () => {
      const res = edit ? await updateClient(initial!.clientId, values) : await createClient(values);
      if (!res.ok) {
        setErrorFields(res.fields ?? []);
        setErrorMsg(res.error);
        return;
      }
      toast.success(edit ? "Cambios guardados." : `${values.nombre} quedó registrado.`);
      router.refresh();
      onSaved?.(res.clientId);
      onClose();
    });
  };

  useModalKeys({ onClose, onSubmit: submit });

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
      aria-label={edit ? "Editar cliente" : "Agregar cliente"}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_32px_70px_-24px_rgba(9,20,15,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line-soft p-5">
          <span className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-brand-tint text-brand">
            <Building2 size={18} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">
              {edit ? "Editar cliente" : "Agregar cliente"}
            </h2>
            <p className="text-[12.5px] text-ink-mid">
              Física o jurídica; sus proyectos y saldos se ven en la ficha.
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

        <form
          className="grid flex-1 grid-cols-2 gap-3.5 overflow-y-auto p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="col-span-2">
            <label className={label} htmlFor="cli-nombre">Nombre o razón social</label>
            <input id="cli-nombre" autoFocus className={field("nombre")} placeholder="Constructora Ejemplo S.A."
              value={values.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="cli-kind">Tipo</label>
            <select id="cli-kind" className={field("kind")} value={values.kind}
              onChange={(e) => set({ kind: e.target.value as ClientFormValues["kind"] })}>
              <option value="JURIDICA">Jurídica</option>
              <option value="FISICA">Física</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="cli-cedula">
              {values.kind === "JURIDICA" ? "Cédula jurídica" : "Cédula / DIMEX"}
            </label>
            <input id="cli-cedula" className={`num ${field("cedula")}`}
              placeholder={values.kind === "JURIDICA" ? "3-101-000000" : "1-0000-0000"}
              value={values.cedula} onChange={(e) => set({ cedula: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="cli-contacto">Contacto</label>
            <input id="cli-contacto" className={field("contacto")} placeholder="Nombre de quien atiende"
              value={values.contacto} onChange={(e) => set({ contacto: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="cli-telefono">Teléfono</label>
            <input id="cli-telefono" className={`num ${field("telefono")}`} placeholder="2222-2222"
              value={values.telefono} onChange={(e) => set({ telefono: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="cli-email">Correo</label>
            <input id="cli-email" type="email" className={field("email")} placeholder="contacto@ejemplo.cr"
              value={values.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className={label} htmlFor="cli-notas">Notas</label>
            <textarea id="cli-notas" rows={2}
              className={`field-focus w-full rounded-[10px] border border-control-border bg-surface px-3 py-2 text-[13.5px] text-ink placeholder:text-ink-faint`}
              placeholder="Referencias, condiciones de pago…"
              value={values.notas} onChange={(e) => set({ notas: e.target.value })} />
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
        </form>

        <div className="flex justify-end gap-2 border-t border-line-soft p-4">
          <button type="button" onClick={onClose}
            className="h-[38px] rounded-[10px] border border-control-border bg-surface px-4 text-[13.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app">
            Cancelar
          </button>
          <button type="button" disabled={pending} onClick={submit}
            className="h-[38px] rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none">
            {pending ? "Guardando…" : edit ? "Guardar cambios" : "Guardar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}
