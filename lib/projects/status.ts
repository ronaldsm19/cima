import type { ProjectStatus } from "@prisma/client";
import type { PillTone } from "@/components/ds/Pill";

/** Display label + pill tone per project state; derived `vencido` overrides. */
export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: PillTone }> = {
  COTIZADO: { label: "cotizado", tone: "neutro" },
  ABIERTO: { label: "abierto", tone: "neutro" },
  EN_PROCESO: { label: "en proceso", tone: "pendiente" },
  EN_VISADO: { label: "en visado", tone: "neutro" },
  ENTREGADO: { label: "cobrado", tone: "pagado" },
  CANCELADO: { label: "cancelado", tone: "neutro" },
};

export function projectPill(status: ProjectStatus, vencido: boolean): { label: string; tone: PillTone } {
  return vencido ? { label: "vencido", tone: "vencido" } : PROJECT_STATUS[status];
}
