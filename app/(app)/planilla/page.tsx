import { CalendarOff } from "lucide-react";
import { EmptyState } from "@/components/ds/EmptyState";
import { PlanillaTable } from "@/components/planilla/PlanillaTable";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { ensurePeriod, getPlanillaDTO } from "@/lib/planilla/data";
import { currentPeriodKey, parsePeriodSlug } from "@/lib/planilla/periods";

export default async function PlanillaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requirePermission("planilla.ver");
  const { periodo } = await searchParams;

  const key = parsePeriodSlug(periodo) ?? currentPeriodKey();
  const isCurrent =
    JSON.stringify(key) === JSON.stringify(currentPeriodKey());
  // Only the current quincena is auto-generated, and only by someone who can edit
  const canCreate = isCurrent && (await hasPermission(user.role, "planilla.editar"));
  const period = await ensurePeriod(key, canCreate);

  if (!period) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Este período no existe"
        detail="Todavía no se generó una planilla para esa quincena. Elegí otro período en el selector de arriba."
        tone="neutral"
      />
    );
  }

  const dto = await getPlanillaDTO(period.id, user.role);
  return <PlanillaTable data={dto} />;
}
