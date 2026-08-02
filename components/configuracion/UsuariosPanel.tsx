"use client";

import { AlertTriangle, Plus, UserCheck, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pill } from "@/components/ds/Pill";
import { createUser, toggleUserActive, updateUser, type UserValues } from "@/lib/actions/configuracion";
import { formatDateCR } from "@/lib/format/dates";

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EMPLEADO";
  active: boolean;
  employeeId: string | null;
  employeeName: string | null;
  lastLoginAt: string | null;
}

const ROLE_LABEL = {
  SUPER_ADMIN: "Dueño · acceso total",
  ADMIN: "Asistente",
  EMPLEADO: "Empleado",
} as const;

export function UsuariosPanel({
  users,
  empleados,
}: {
  users: UserRow[];
  empleados: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<UserValues>({
    email: "",
    name: "",
    role: "ADMIN",
    employeeId: null,
    password: "",
  });

  const abrirAlta = () => {
    setValues({ email: "", name: "", role: "ADMIN", employeeId: null, password: "" });
    setEditing(null);
    setError(null);
    setForm(true);
  };

  const abrirEdicion = (u: UserRow) => {
    setValues({ email: u.email, name: u.name, role: u.role, employeeId: u.employeeId, password: "" });
    setEditing(u.id);
    setError(null);
    setForm(true);
  };

  const guardar = () => {
    setError(null);
    startTransition(async () => {
      const res = editing ? await updateUser(editing, values) : await createUser(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(editing ? "Usuario actualizado." : `${values.email} ya puede entrar.`);
      setForm(false);
      router.refresh();
    });
  };

  const toggle = (u: UserRow) => {
    startTransition(async () => {
      const res = await toggleUserActive(u.id, !u.active);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${u.email} ${u.active ? "desactivado" : "activado"}.`);
        router.refresh();
      }
    });
  };

  const field =
    "field-focus h-[34px] w-full rounded-[10px] border border-control-border bg-surface px-2.5 text-[13px] text-ink";
  const label = "mb-1 block text-[11.5px] font-semibold text-ink-dim";

  return (
    <section className="rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <div>
          <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Usuarios</h2>
          <p className="mt-0.5 text-[12px] text-ink-mid">
            Quién puede entrar y con qué rol. Un usuario empleado ve solo su propio portal.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex h-[34px] flex-none items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover"
        >
          <Plus size={14} strokeWidth={2.2} aria-hidden /> Nuevo usuario
        </button>
      </header>

      <div className="overflow-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead className="bg-surface-subtle">
            <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
              <th className="px-4 text-left">Nombre</th>
              <th className="px-2 text-left">Correo</th>
              <th className="px-2 text-left">Rol</th>
              <th className="px-2 text-left">Último acceso</th>
              <th className="w-[150px] px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="h-[46px] border-b border-line-row text-[13px] hover:bg-row-hover">
                <td className="px-4">
                  <span className="font-semibold text-ink">{u.name}</span>
                  {u.employeeName ? (
                    <span className="ml-1.5 text-[11.5px] text-ink-faint">→ {u.employeeName}</span>
                  ) : null}
                </td>
                <td className="num px-2 text-[12.5px] text-ink-mid">{u.email}</td>
                <td className="px-2">
                  <Pill tone={u.role === "SUPER_ADMIN" ? "pagado" : "neutro"}>{ROLE_LABEL[u.role]}</Pill>
                </td>
                <td className="num px-2 text-[12px] text-ink-dim">
                  {u.lastLoginAt ? formatDateCR(u.lastLoginAt) : "nunca"}
                </td>
                <td className="px-4 text-right">
                  <button
                    type="button"
                    onClick={() => abrirEdicion(u)}
                    className="mr-3 text-[12.5px] font-semibold text-brand hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(u)}
                    className={`inline-flex items-center gap-1 text-[12.5px] font-semibold ${
                      u.active ? "text-bad-text" : "text-ok"
                    } hover:underline disabled:text-ink-faint`}
                  >
                    {u.active ? (
                      <>
                        <UserX size={13} strokeWidth={2} aria-hidden /> Desactivar
                      </>
                    ) : (
                      <>
                        <UserCheck size={13} strokeWidth={2} aria-hidden /> Activar
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form ? (
        <div className="border-t border-line-soft bg-app/40 p-4">
          <div className="mb-2 text-[13px] font-bold text-ink">
            {editing ? "Editar usuario" : "Nuevo usuario"}
          </div>
          <div className="grid grid-cols-4 gap-2.5 max-[960px]:grid-cols-2">
            <div>
              <label className={label} htmlFor="us-nombre">Nombre</label>
              <input id="us-nombre" className={field} value={values.name}
                onChange={(e) => { setValues((v) => ({ ...v, name: e.target.value })); setError(null); }} />
            </div>
            <div>
              <label className={label} htmlFor="us-email">Correo</label>
              <input id="us-email" type="email" className={`num ${field}`} value={values.email}
                onChange={(e) => { setValues((v) => ({ ...v, email: e.target.value })); setError(null); }} />
            </div>
            <div>
              <label className={label} htmlFor="us-rol">Rol</label>
              <select id="us-rol" className={field} value={values.role}
                onChange={(e) => setValues((v) => ({ ...v, role: e.target.value as UserValues["role"] }))}>
                <option value="SUPER_ADMIN">Dueño · acceso total</option>
                <option value="ADMIN">Asistente</option>
                <option value="EMPLEADO">Empleado</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="us-emp">Ficha de empleado</label>
              <select id="us-emp" className={field} value={values.employeeId ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, employeeId: e.target.value || null }))}>
                <option value="">Sin enlazar</option>
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className={label} htmlFor="us-pass">
                {editing ? "Contraseña nueva (dejala vacía para no cambiarla)" : "Contraseña (mínimo 10 caracteres)"}
              </label>
              <input id="us-pass" type="password" className={field} value={values.password ?? ""}
                onChange={(e) => { setValues((v) => ({ ...v, password: e.target.value })); setError(null); }} />
            </div>
          </div>

          {error ? (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-bad-border bg-bad-tint-soft px-3 py-2 text-[12.5px] text-[#8E3323]">
              <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <button type="button" disabled={pending} onClick={guardar}
              className="h-[38px] rounded-[10px] bg-brand px-4 text-[13.5px] font-semibold text-white shadow-[0_1px_2px_rgba(14,107,78,0.35)] transition-colors duration-[140ms] hover:bg-brand-hover disabled:cursor-not-allowed disabled:bg-[#F7F9F6] disabled:text-[#A9B2AB] disabled:shadow-none">
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setForm(false)}
              className="h-[38px] rounded-[10px] border border-control-border bg-surface px-4 text-[13.5px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
