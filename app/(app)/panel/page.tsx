import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { requirePermission } from "@/lib/auth/access";

export default async function PanelPage() {
  await requirePermission("panel.ver");
  return (
    <EmptyState
      icon={LayoutDashboard}
      title="El panel llega en la Fase 4"
      detail="Acá van las métricas del período, la lista de falta pagarles y las cuentas por cobrar."
    />
  );
}
