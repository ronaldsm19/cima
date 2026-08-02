import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { MiPortal } from "@/components/portal/MiPortal";
import { requirePermission } from "@/lib/auth/access";
import { getMiPortal } from "@/lib/portal/data";

export default async function MiPortalPage() {
  const user = await requirePermission("portal.propio");

  if (!user.employeeId) {
    return (
      <EmptyState
        icon={UserX}
        title="Tu usuario no está enlazado a una ficha de empleado"
        detail="Pedile al dueño que lo enlace desde Configuración para poder ver tus colillas y tus vacaciones."
        tone="neutral"
      />
    );
  }

  const data = await getMiPortal(user.employeeId);
  if (!data) {
    return (
      <EmptyState
        icon={UserX}
        title="No encontramos tu ficha"
        detail="La ficha enlazada a tu usuario ya no existe. Avisale al dueño."
        tone="neutral"
      />
    );
  }

  return <MiPortal data={data} />;
}
