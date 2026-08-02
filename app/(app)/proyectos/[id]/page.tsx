import { Folder } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function ProyectoPage() {
  await requirePermission("proyectos.ver");
  return (
    <EmptyState
      icon={Folder}
      title="El formulario de proyecto llega en la Fase 6"
      detail="Acá van los datos del proyecto, el registro de abonos y el panel de saldo en vivo."
    />
  );
}
