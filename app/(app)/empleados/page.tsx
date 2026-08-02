import { redirect } from "next/navigation";
import { EmployeeChips } from "@/components/empleados/EmployeeChips";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { getParameterSetFor, toPlainParams } from "@/lib/db/params";
import { listEmployeeChips } from "@/lib/empleados/data";
import { todayCR } from "@/lib/format/dates";

export default async function EmpleadosPage() {
  const user = await requirePermission("empleados.ver");
  const employees = await listEmployeeChips();
  if (employees.length > 0) redirect(`/empleados/${employees[0].id}`);

  const params = toPlainParams(await getParameterSetFor(todayCR()));
  const canCrud = await hasPermission(user.role, "empleados.crud");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <EmployeeChips employees={[]} activeId={null} canCrud={canCrud} params={params} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface text-center shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="text-[14px] font-semibold text-ink">Todavía no hay empleados</div>
        <div className="text-[12.5px] text-ink-mid">
          Agregá el primero con el botón de arriba; entra en la planilla del período apenas se guarde.
        </div>
      </div>
    </div>
  );
}
