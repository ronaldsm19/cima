import { Decimal } from "decimal.js";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { vacationBalance } from "@/lib/db/vacations";
import { fullMonthsBetween, todayCR } from "@/lib/format/dates";
import { periodLabel } from "@/lib/planilla/periods";
import { projectPill } from "@/lib/projects/status";
import type { PillTone } from "@/components/ds/Pill";

/**
 * Everything the EMPLEADO portal shows — scoped to one employee by
 * construction: every query filters by employeeId, so a portal user can never
 * read another person's numbers even if they tamper with the URL.
 */
export interface MiPortalDTO {
  nombre: string;
  puesto: string;
  cedula: string;
  iban: string | null;
  ingreso: string;
  antiguedad: string;
  modalidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
  vacaciones: { acumulado: number; tomados: number; saldo: number };
  proximoPago: { periodo: string; neto: string | null; pagado: boolean; payDate: string } | null;
  colillas: {
    itemId: string;
    periodo: string;
    pagadoEl: string | null;
    bruto: string;
    deducciones: string;
    neto: string;
    pagado: boolean;
  }[];
  misVacaciones: { rango: string; dias: number; estado: string }[];
  misProyectos: {
    id: string;
    code: string;
    cliente: string;
    trabajo: string;
    fincaPlano: string;
    plano: string | null;
    rol: string | null;
    entrega: string | null;
    pctCobrado: number;
    pill: { label: string; tone: PillTone };
  }[];
}

function antiguedadLabel(hireDate: string, today: string): string {
  const months = fullMonthsBetween(hireDate, today);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mes${rest !== 1 ? "es" : ""}`;
  if (rest === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} ${rest} mes${rest !== 1 ? "es" : ""}`;
}

const VAC_ESTADO: Record<string, string> = {
  SOLICITADA: "solicitada",
  APROBADA: "aprobada",
  RECHAZADA: "rechazada",
  DISFRUTADA: "disfrutada",
};

export async function getMiPortal(employeeId: string): Promise<MiPortalDTO | null> {
  const today = todayCR();
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      contracts: true,
      payrollItems: { include: { period: true } },
      vacationRequests: { orderBy: { startDate: "desc" } },
      projectAssignments: {
        include: { project: { include: { client: true, payments: true } } },
      },
    },
  });
  if (!employee || employee.deletedAt !== null) return null;

  const contract = employee.contracts
    .filter((c) => c.validTo === null)
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0]
    ?? employee.contracts.sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0];

  const vac = await vacationBalance(employeeId, employee.hireDate, today);

  const conMontos = employee.payrollItems
    .filter((i) => i.neto != null)
    .sort((a, b) => (a.period.startDate < b.period.startDate ? 1 : -1));

  const colillas = conMontos.slice(0, 12).map((i) => ({
    itemId: i.id,
    periodo: periodLabel(i.period),
    pagadoEl: i.paidAt,
    bruto: centsToString(i.bruto!),
    deducciones: centsToString(i.totalDeducciones! + i.adelanto),
    neto: centsToString(i.neto!),
    pagado: i.paymentStatus === "PAGADO",
  }));

  // Nearest unpaid line, or the most recent one
  const pendiente = conMontos.find((i) => i.paymentStatus === "PENDIENTE") ?? conMontos[0] ?? null;

  const misProyectos = employee.projectAssignments
    .filter((a) => a.project.deletedAt === null)
    .map((a) => {
      const d = projectDerived(a.project, a.project.payments, today);
      return {
        id: a.project.id,
        code: a.project.code,
        cliente: a.project.client.name,
        trabajo: a.project.description ?? a.project.type,
        fincaPlano: a.project.fincaFolio ?? "—",
        plano: a.project.planoNumber,
        rol: a.roleInProject,
        entrega: a.project.dueDate,
        pctCobrado: d.pctCobrado,
        pill: projectPill(a.project.status, d.vencido),
      };
    })
    .sort((a, b) => (a.code < b.code ? 1 : -1));

  return {
    nombre: employee.fullName,
    puesto: employee.position,
    cedula: employee.cedula,
    iban: employee.iban,
    ingreso: employee.hireDate,
    antiguedad: antiguedadLabel(employee.hireDate, today),
    modalidad: contract?.salaryUnit ?? "QUINCENAL",
    vacaciones: vac,
    proximoPago: pendiente
      ? {
          periodo: periodLabel(pendiente.period),
          neto: pendiente.neto != null ? centsToString(pendiente.neto) : null,
          pagado: pendiente.paymentStatus === "PAGADO",
          payDate: pendiente.period.payDate,
        }
      : null,
    colillas,
    misVacaciones: employee.vacationRequests.map((v) => ({
      rango: `${v.startDate} — ${v.endDate}`,
      dias: v.businessDays,
      estado: VAC_ESTADO[v.status] ?? v.status.toLowerCase(),
    })),
    misProyectos,
  };
}

/** Employees available to assign to a project (for the ficha de proyecto). */
export async function listAssignableEmployees() {
  const employees = await prisma.employee.findMany({
    where: { ...notDeleted, status: "ACTIVO" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, position: true },
  });
  return employees.map((e) => ({ id: e.id, nombre: e.fullName, puesto: e.position }));
}

/** Total gross earned in the last 12 approved periods (portal summary). */
export function sumBrutos(colillas: { bruto: string }[]): string {
  return colillas.reduce((acc, c) => acc.plus(c.bruto), new Decimal(0)).toFixed(2);
}
