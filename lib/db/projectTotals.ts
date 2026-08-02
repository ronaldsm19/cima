import type { ClientPayment, Project } from "@prisma/client";
import { Decimal } from "decimal.js";
import { centsToDecimal } from "@/lib/db/money";
import { isoToUtc, todayCR } from "@/lib/format/dates";

/**
 * Derived project money — THE single source for totalAbonado / saldoPendiente /
 * primaCubierta / vencido. Panel, ficha de cliente, formulario de proyecto and
 * reports all call this, so the three screens can never disagree. Never store
 * these values.
 */

export interface ProjectDerived {
  totalAbonado: Decimal;
  saldoPendiente: Decimal;
  /** Prima pactada in colones (agreedAmount × primaPct). */
  primaMonto: Decimal;
  primaCubierta: boolean;
  /** % cobrado (0-100, rounded to integer). */
  pctCobrado: number;
  vencido: boolean;
  diasVencido: number;
}

const CLOSED: Project["status"][] = ["ENTREGADO", "CANCELADO"];

export function projectDerived(
  project: Pick<Project, "agreedAmount" | "primaPct" | "status" | "dueDate">,
  payments: Pick<ClientPayment, "amount" | "deletedAt">[],
  todayIso: string = todayCR(),
): ProjectDerived {
  const agreed = centsToDecimal(project.agreedAmount);
  const totalAbonado = payments
    .filter((p) => p.deletedAt === null)
    .reduce((acc, p) => acc.plus(centsToDecimal(p.amount)), new Decimal(0));
  const saldoPendiente = Decimal.max(new Decimal(0), agreed.minus(totalAbonado));
  const primaMonto = agreed
    .mul(new Decimal(String(project.primaPct)))
    .div(100)
    .toDecimalPlaces(2);
  const vencido =
    !CLOSED.includes(project.status) &&
    project.dueDate !== null &&
    project.dueDate < todayIso;
  const diasVencido = vencido
    ? Math.round(
        (isoToUtc(todayIso).getTime() - isoToUtc(project.dueDate!).getTime()) / 86_400_000,
      )
    : 0;
  return {
    totalAbonado,
    saldoPendiente,
    primaMonto,
    primaCubierta: totalAbonado.gte(primaMonto),
    pctCobrado: agreed.isZero()
      ? 0
      : Math.min(100, Math.round(totalAbonado.div(agreed).mul(100).toNumber())),
    vencido,
    diasVencido,
  };
}
