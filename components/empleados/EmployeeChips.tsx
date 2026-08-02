"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmployeeModal } from "@/components/empleados/EmployeeModal";
import type { PlainEngineParams } from "@/lib/payroll/params";

export interface EmployeeChip {
  id: string;
  nombre: string;
}

/** Chip row per README §3 + the dashed "+ Agregar empleado" chip. */
export function EmployeeChips({
  employees,
  activeId,
  canCrud,
  params,
}: {
  employees: EmployeeChip[];
  activeId: string | null;
  canCrud: boolean;
  params: PlainEngineParams;
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {employees.map((e) => (
        <Link
          key={e.id}
          href={`/empleados/${e.id}`}
          className={`flex h-8 items-center rounded-full px-[13px] text-[12.5px] font-semibold transition-colors duration-[140ms] ${
            e.id === activeId
              ? "bg-brand text-white"
              : "border border-[#E0E6DF] bg-surface text-ink-strong hover:border-[#C6D0C7]"
          }`}
        >
          {e.nombre}
        </Link>
      ))}
      {canCrud ? (
        <button
          type="button"
          onClick={() => setModal(true)}
          className="flex h-8 items-center gap-1 rounded-full border border-dashed border-[#B9C7BD] px-[13px] text-[12.5px] font-semibold text-brand transition-colors duration-[140ms] hover:bg-brand-tint"
        >
          <Plus size={13} strokeWidth={2.2} aria-hidden /> Agregar empleado
        </button>
      ) : null}
      {modal ? (
        <EmployeeModal
          params={params}
          onClose={() => setModal(false)}
          onSaved={(id) => router.push(`/empleados/${id}`)}
        />
      ) : null}
    </div>
  );
}
