import { notFound } from "next/navigation";
import { EmployeeChips } from "@/components/empleados/EmployeeChips";
import { FichaEmpleado } from "@/components/empleados/FichaEmpleado";
import { requirePermission } from "@/lib/auth/access";
import { getFichaEmpleado, listEmployeeChips } from "@/lib/empleados/data";

export default async function FichaEmpleadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("empleados.ver");
  const { id } = await params;

  const [employees, ficha] = await Promise.all([
    listEmployeeChips(),
    getFichaEmpleado(id, user.role),
  ]);
  if (!ficha) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <EmployeeChips
        employees={employees}
        activeId={ficha.id}
        canCrud={ficha.permisos.crud}
        params={ficha.params}
      />
      <FichaEmpleado ficha={ficha} />
    </div>
  );
}
