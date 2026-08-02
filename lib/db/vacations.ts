import { Decimal } from "decimal.js";
import { getParameterSetFor } from "@/lib/db/params";
import { prisma } from "@/lib/db/prisma";
import { todayCR } from "@/lib/format/dates";
import { accruedDays } from "@/lib/payroll/vacations";

/**
 * Vacation balance — computed, never stored (plan decision #3):
 * accrual by law (parametrized days/month) + manual adjustments − taken days.
 */
export interface VacationBalance {
  acumulado: number;
  tomados: number;
  saldo: number;
}

export async function vacationBalance(
  employeeId: string,
  hireDate: string,
  asOf: string = todayCR(),
): Promise<VacationBalance> {
  const [params, adjustments, taken] = await Promise.all([
    getParameterSetFor(asOf),
    prisma.vacationAdjustment.findMany({ where: { employeeId } }),
    prisma.vacationRequest.findMany({
      where: { employeeId, status: { in: ["APROBADA", "DISFRUTADA"] } },
    }),
  ]);

  const accrued = accruedDays(hireDate, asOf, new Decimal(String(params.vacacionesDiasPorMes)));
  const adjusted = adjustments.reduce((acc, a) => acc.plus(new Decimal(String(a.days))), accrued);
  const tomados = taken.reduce((acc, t) => acc + t.businessDays, 0);
  const acumulado = adjusted.toDecimalPlaces(1).toNumber();

  return {
    acumulado,
    tomados: Math.round(tomados * 10) / 10,
    saldo: Math.round((acumulado - tomados) * 10) / 10,
  };
}
