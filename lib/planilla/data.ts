import type { PayrollAdjustment, Prisma } from "@prisma/client";
import { hasPermission } from "@/lib/auth/access";
import type { AppRole } from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { getParameterSetById, getParameterSetFor, toPlainParams } from "@/lib/db/params";
import { prisma } from "@/lib/db/prisma";
import {
  currentPeriodKey,
  periodDates,
  periodLabel,
  periodSlug,
  type PeriodKey,
} from "./periods";
import type {
  LineSnapshot,
  PeriodOptionDTO,
  PlainAdjustment,
  PlanillaDTO,
  PlanillaLineDTO,
} from "./dto";

/** Contract in force for an employee during a period (latest validFrom ≤ endDate). */
export function contractInForce<T extends { validFrom: string; validTo: string | null }>(
  contracts: T[],
  startDate: string,
  endDate: string,
): T | null {
  const candidates = contracts
    .filter((c) => c.validFrom <= endDate && (c.validTo === null || c.validTo >= startDate))
    .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1));
  return candidates[0] ?? null;
}

/** Recurring adjustments overlapping the period + one-offs pinned to it. */
export function adjustmentsForPeriod(
  adjustments: PayrollAdjustment[],
  periodId: string,
  startDate: string,
  endDate: string,
): PlainAdjustment[] {
  return adjustments
    .filter((a) => a.deletedAt === null)
    .filter((a) =>
      a.recurring
        ? (a.validFrom === null || a.validFrom <= endDate) &&
          (a.validTo === null || a.validTo >= startDate)
        : a.periodId === periodId,
    )
    .filter((a): a is PayrollAdjustment & { type: PlainAdjustment["type"] } =>
      ["SOLIDARISTA", "EMBARGO", "OTRA_DEDUCCION"].includes(a.type),
    )
    .map((a) => ({
      type: a.type,
      mode: a.mode,
      amount: a.amount != null ? centsToString(a.amount) : undefined,
      ratePct: a.ratePct ?? undefined,
      note: a.note ?? undefined,
    }));
}

/**
 * Finds the period, creating it (BORRADOR, pinned parameter set, one line per
 * active employee) when it doesn't exist yet and creation is allowed.
 */
export async function ensurePeriod(key: PeriodKey, canCreate: boolean) {
  const existing = await prisma.payrollPeriod.findUnique({
    where: { year_month_numero_type: { ...key, type: "QUINCENAL" } },
  });
  if (existing || !canCreate) return existing;

  const dates = periodDates(key);
  const paramSet = await getParameterSetFor(dates.startDate);
  const employees = await prisma.employee.findMany({
    where: { ...notDeleted, status: "ACTIVO" },
    include: { contracts: true },
  });

  const period = await prisma.payrollPeriod.create({
    data: {
      type: "QUINCENAL",
      ...key,
      startDate: dates.startDate,
      endDate: dates.endDate,
      payDate: dates.payDate,
      status: "BORRADOR",
      parameterSetId: paramSet.id,
    },
  });

  for (const emp of employees) {
    const contract = contractInForce(emp.contracts, dates.startDate, dates.endDate);
    if (!contract) continue; // employee without a valid contract stays out of the period
    await prisma.payrollItem.create({
      data: {
        periodId: period.id,
        employeeId: emp.id,
        contractId: contract.id,
      },
    });
  }
  return period;
}

/** Options for the header period selector (existing periods, newest first). */
export async function listPeriodOptions(): Promise<PeriodOptionDTO[]> {
  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }, { numero: "desc" }],
    take: 24,
  });
  const options = periods.map((p) => ({
    slug: periodSlug(p),
    label: periodLabel(p),
    status: p.status,
  }));
  const current = currentPeriodKey();
  const currentSlug = periodSlug(current);
  if (!options.some((o) => o.slug === currentSlug)) {
    const dates = periodDates(current);
    options.unshift({
      slug: currentSlug,
      label: periodLabel({ ...current, startDate: dates.startDate, endDate: dates.endDate }),
      status: "BORRADOR",
    });
  }
  return options;
}

/** Full serializable payload for the planilla screen. */
export async function getPlanillaDTO(periodId: string, role: AppRole): Promise<PlanillaDTO> {
  const period = await prisma.payrollPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: {
      items: {
        include: {
          employee: { include: { contracts: true, adjustments: true } },
        },
      },
    },
  });

  const paramSet = await getParameterSetById(period.parameterSetId);

  const lines: PlanillaLineDTO[] = period.items
    .filter((item) => item.employee.deletedAt === null)
    .map((item) => {
      const contract =
        item.employee.contracts.find((c) => c.id === item.contractId) ??
        contractInForce(item.employee.contracts, period.startDate, period.endDate);
      if (!contract) throw new Error(`El empleado ${item.employee.fullName} no tiene contrato vigente.`);

      const snapshot: LineSnapshot | null =
        item.neto != null
          ? {
              basePeriodo: centsToString(item.basePeriodo!),
              montoExtra: centsToString(item.montoExtra!),
              bruto: centsToString(item.bruto!),
              ccssTotal: centsToString(item.ccssTotal!),
              renta: centsToString(item.renta!),
              solidarista: centsToString(item.solidarista!),
              embargo: centsToString(item.embargo!),
              otrasDeducciones: centsToString(item.otrasDeducciones!),
              neto: centsToString(item.neto!),
              trace: (item.trace as LineSnapshot["trace"] | null) ?? [],
            }
          : null;

      return {
        itemId: item.id,
        employeeId: item.employeeId,
        nombre: item.employee.fullName,
        puesto: item.employee.position,
        cedula: item.employee.cedula,
        iban: item.employee.iban,
        modalidad: contract.salaryUnit,
        salarioBase: centsToString(contract.baseSalary),
        numHijos: item.employee.numHijos,
        tieneConyuge: item.employee.tieneConyuge,
        adjustments: adjustmentsForPeriod(
          item.employee.adjustments,
          period.id,
          period.startDate,
          period.endDate,
        ),
        horasExtra: item.horasExtra,
        adelanto: centsToString(item.adelanto),
        pagado: item.paymentStatus === "PAGADO",
        paidAt: item.paidAt,
        snapshot,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const [editar, aprobar, marcarPagos, generarColillas] = await Promise.all([
    hasPermission(role, "planilla.editar"),
    hasPermission(role, "planilla.aprobar"),
    hasPermission(role, "pagos.marcar"),
    hasPermission(role, "colillas.generar"),
  ]);

  return {
    periodId: period.id,
    slug: periodSlug(period),
    label: periodLabel(period),
    status: period.status,
    payDate: period.payDate,
    lines,
    params: toPlainParams(paramSet),
    permisos: { editar, aprobar, marcarPagos, generarColillas },
  };
}

/** Prisma type helper reused by the approval action. */
export type PeriodWithItems = Prisma.PayrollPeriodGetPayload<{
  include: { items: { include: { employee: { include: { contracts: true; adjustments: true } } } } };
}>;
