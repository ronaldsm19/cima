import { User } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function EmpleadosPage() {
  await requirePermission("empleados.ver");
  return (
    <EmptyState
      icon={User}
      title="La ficha de empleado llega en la Fase 5"
      detail="Acá van los chips de empleados, el cajetín de datos y las pestañas de contrato, pagos y vacaciones."
    />
  );
}
