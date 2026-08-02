"use client";

import { Plus, UserMinus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AvatarInitials } from "@/components/ds/AvatarInitials";
import { asignarEmpleado, quitarAsignacion } from "@/lib/actions/asignaciones";

export interface AssignmentRow {
  employeeId: string;
  nombre: string;
  rol: string | null;
}

/** Team on a project — what the EMPLEADO portal reads to show "mis proyectos". */
export function AssignmentsCard({
  projectId,
  asignados,
  disponibles,
  canEdit,
}: {
  projectId: string;
  asignados: AssignmentRow[];
  disponibles: { id: string; nombre: string; puesto: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [empId, setEmpId] = useState("");
  const [rol, setRol] = useState("");
  const [pending, startTransition] = useTransition();

  const libres = disponibles.filter((d) => !asignados.some((a) => a.employeeId === d.id));

  const asignar = () => {
    if (!empId) return;
    startTransition(async () => {
      const res = await asignarEmpleado(projectId, empId, rol);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Empleado asignado al proyecto.");
        setEmpId("");
        setRol("");
        router.refresh();
      }
    });
  };

  const quitar = (a: AssignmentRow) => {
    startTransition(async () => {
      const res = await quitarAsignacion(projectId, a.employeeId);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`${a.nombre.split(" ")[0]} quedó fuera del proyecto.`);
        router.refresh();
      }
    });
  };

  const field =
    "field-focus h-[34px] rounded-[10px] border border-control-border bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-faint";

  return (
    <div className="border-t border-line-soft p-4">
      <div className="mb-2 flex items-center gap-2">
        <Users size={15} strokeWidth={1.8} className="text-ink-dim" aria-hidden />
        <h3 className="text-[13.5px] font-bold text-ink">Equipo asignado</h3>
        <span className="num flex h-[20px] items-center rounded-full bg-[#EDF2EF] px-2 text-[11px] font-bold text-[#4A6B5C]">
          {asignados.length}
        </span>
      </div>

      {asignados.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[#D8DFD7] bg-row-hover px-4 py-4 text-center text-[12.5px] text-ink-mid">
          Asigná a quienes trabajan en esta finca: lo van a ver en su portal.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {asignados.map((a) => (
            <li
              key={a.employeeId}
              className="flex items-center gap-2 rounded-full border border-[#E0E6DF] bg-surface py-1 pl-1 pr-2.5"
            >
              <AvatarInitials name={a.nombre} size={28} />
              <span className="text-[12.5px] font-semibold text-ink">{a.nombre}</span>
              {a.rol ? <span className="text-[11.5px] text-ink-faint">· {a.rol}</span> : null}
              {canEdit ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => quitar(a)}
                  className="ml-1 text-ink-faint transition-colors duration-[140ms] hover:text-bad-text"
                  aria-label={`Quitar a ${a.nombre}`}
                >
                  <UserMinus size={14} strokeWidth={1.8} aria-hidden />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit && libres.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-end gap-2.5">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim" htmlFor="as-emp">
              Empleado
            </label>
            <select id="as-emp" className={`${field} w-full`} value={empId} onChange={(e) => setEmpId(e.target.value)}>
              <option value="">Elegí a quién asignar…</option>
              {libres.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} · {d.puesto}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="mb-1 block text-[11.5px] font-semibold text-ink-dim" htmlFor="as-rol">
              Rol en el proyecto
            </label>
            <input id="as-rol" className={`${field} w-full`} placeholder="Cadenero, dibujo…"
              value={rol} onChange={(e) => setRol(e.target.value)} />
          </div>
          <button
            type="button"
            disabled={pending || !empId}
            onClick={asignar}
            className="flex h-[34px] items-center gap-1.5 rounded-[10px] border border-control-border bg-surface px-3.5 text-[13px] font-semibold text-[#2C3A33] transition-colors duration-[140ms] hover:bg-app disabled:cursor-not-allowed disabled:text-ink-faint"
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden /> Asignar
          </button>
        </div>
      ) : null}
    </div>
  );
}
