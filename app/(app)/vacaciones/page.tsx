import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { VacationCalendar } from "@/components/vacaciones/VacationCalendar";
import { requirePermission } from "@/lib/auth/access";
import { getVacacionesDTO } from "@/lib/vacaciones/data";

export default async function VacacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ emp?: string }>;
}) {
  const user = await requirePermission("vacaciones.ver");
  const { emp } = await searchParams;

  const data = await getVacacionesDTO(user.role);
  if (data.empleados.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No hay empleados activos"
        detail="Agregá empleados en la ficha para poder registrarles vacaciones."
      />
    );
  }

  return <VacationCalendar data={data} initialEmployeeId={emp} />;
}
