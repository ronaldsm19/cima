import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function ClientesPage() {
  await requirePermission("clientes.ver");
  return (
    <EmptyState
      icon={Building2}
      title="La ficha de cliente llega en la Fase 6"
      detail="Acá van los datos del cliente y su tabla de proyectos con saldos."
    />
  );
}
