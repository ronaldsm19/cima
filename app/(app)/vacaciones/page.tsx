import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function VacacionesPage() {
  await requirePermission("vacaciones.ver");
  return (
    <EmptyState
      icon={CalendarDays}
      title="El calendario de vacaciones llega en la Fase 7"
      detail="Acá va la selección de rango sobre dos meses con el cálculo de días hábiles."
    />
  );
}
