import { User } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function MiPortalPage() {
  await requirePermission("portal.propio");
  return (
    <EmptyState
      icon={User}
      title="Tu portal llega en la Fase 8"
      detail="Acá vas a ver tus colillas, tu saldo de vacaciones y los proyectos que tenés asignados."
    />
  );
}
