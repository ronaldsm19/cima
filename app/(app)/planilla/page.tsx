import { Table } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function PlanillaPage() {
  await requirePermission("planilla.ver");
  return (
    <EmptyState
      icon={Table}
      title="La planilla llega en la Fase 3"
      detail="Acá va la tabla del período con edición en línea, desglose por empleado y aprobación."
    />
  );
}
