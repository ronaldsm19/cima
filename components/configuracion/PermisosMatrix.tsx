"use client";

import { Check, Lock, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setPermission } from "@/lib/actions/configuracion";
import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

/** Role × permission matrix, editable by SUPER_ADMIN (user requirement). */
export function PermisosMatrix({
  effective,
}: {
  effective: Record<"ADMIN" | "EMPLEADO", Record<string, boolean>>;
}) {
  const router = useRouter();
  const [state, setState] = useState(effective);
  const [pending, startTransition] = useTransition();

  const grupos = new Map<string, PermissionKey[]>();
  for (const [key, meta] of Object.entries(PERMISSIONS)) {
    const list = grupos.get(meta.group) ?? [];
    list.push(key as PermissionKey);
    grupos.set(meta.group, list);
  }

  const toggle = (role: "ADMIN" | "EMPLEADO", key: PermissionKey) => {
    const next = !state[role][key];
    setState((s) => ({ ...s, [role]: { ...s[role], [key]: next } }));
    startTransition(async () => {
      const res = await setPermission(role, key, next);
      if (!res.ok) {
        toast.error(res.error);
        setState((s) => ({ ...s, [role]: { ...s[role], [key]: !next } }));
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
      <header className="border-b border-line-soft px-4 py-3">
        <h2 className="text-[14.5px] font-bold tracking-[-0.01em] text-ink">Permisos por rol</h2>
        <p className="mt-0.5 text-[12px] text-ink-mid">
          Los cambios aplican de inmediato. El dueño siempre conserva acceso total: no se puede
          dejar fuera a sí mismo.
        </p>
      </header>

      <div className="overflow-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead className="bg-surface-subtle">
            <tr className="h-[42px] border-b border-line-soft text-[11.5px] font-semibold text-ink-dim">
              <th className="px-4 text-left">Permiso</th>
              <th className="w-[120px] px-2 text-center">Dueño</th>
              <th className="w-[120px] px-2 text-center">Asistente</th>
              <th className="w-[120px] px-4 text-center">Empleado</th>
            </tr>
          </thead>
          <tbody>
            {[...grupos.entries()].map(([grupo, keys]) => (
              <>
                <tr key={grupo} className="bg-app">
                  <td
                    colSpan={4}
                    className="px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-dim"
                  >
                    {grupo}
                  </td>
                </tr>
                {keys.map((key) => (
                  <tr key={key} className="h-[42px] border-b border-line-row text-[13px] hover:bg-row-hover">
                    <td className="px-4 text-ink">{PERMISSIONS[key].label}</td>
                    <td className="px-2 text-center">
                      <span
                        className="inline-flex size-6 items-center justify-center rounded-md bg-ok-tint text-ok"
                        title="El dueño siempre tiene todos los permisos"
                      >
                        <Lock size={12} strokeWidth={2.2} aria-hidden />
                      </span>
                    </td>
                    <td className="px-2 text-center">
                      <Toggle
                        on={state.ADMIN[key]}
                        disabled={pending}
                        onClick={() => toggle("ADMIN", key)}
                        label={`Asistente · ${PERMISSIONS[key].label}`}
                      />
                    </td>
                    <td className="px-4 text-center">
                      <Toggle
                        on={state.EMPLEADO[key]}
                        disabled={pending}
                        onClick={() => toggle("EMPLEADO", key)}
                        label={`Empleado · ${PERMISSIONS[key].label}`}
                      />
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Toggle({
  on,
  disabled,
  onClick,
  label,
}: {
  on: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`inline-flex size-6 items-center justify-center rounded-md transition-colors duration-[140ms] ${
        on ? "bg-ok-tint text-ok hover:bg-ok/20" : "bg-[#EDF0EC] text-ink-faint hover:bg-[#E0E6DF]"
      } disabled:cursor-not-allowed`}
    >
      {on ? <Check size={13} strokeWidth={2.6} aria-hidden /> : <X size={13} strokeWidth={2.4} aria-hidden />}
    </button>
  );
}
