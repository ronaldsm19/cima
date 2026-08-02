"use server";

import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionAction } from "@/lib/auth/access";
import { centsToString, decimalToCents } from "@/lib/db/money";
import { getParameterSetById, toPlainParams } from "@/lib/db/params";
import { prisma } from "@/lib/db/prisma";
import { formatCRC } from "@/lib/format/currency";
import { formatDateCR, todayCR } from "@/lib/format/dates";
import { notify, ownerIds, userIdForEmployee } from "@/lib/notifications/notify";
import { adjustmentsForPeriod, contractInForce } from "@/lib/planilla/data";
import { computeLine } from "@/lib/planilla/compute";
import { periodLabel } from "@/lib/planilla/periods";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  return { ok: false, error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo." };
}

const lineInputSchema = z.object({
  itemId: z.string().min(1),
  horasExtra: z.number().min(0).max(200).multipleOf(0.01).optional(),
  adelanto: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Monto inválido")
    .optional(),
});

/** Persist inline edits (horas extra / adelanto) while the period is BORRADOR. */
export async function updatePlanillaLine(input: z.infer<typeof lineInputSchema>): Promise<ActionResult> {
  try {
    const user = await requirePermissionAction("planilla.editar");
    const data = lineInputSchema.parse(input);

    const item = await prisma.payrollItem.findUniqueOrThrow({
      where: { id: data.itemId },
      include: { period: true },
    });
    if (item.period.status !== "BORRADOR") {
      return { ok: false, error: "El período ya está aprobado: los montos quedaron congelados." };
    }

    const before = { horasExtra: item.horasExtra, adelanto: centsToString(item.adelanto) };
    const updated = await prisma.payrollItem.update({
      where: { id: item.id },
      data: {
        ...(data.horasExtra !== undefined ? { horasExtra: data.horasExtra } : {}),
        ...(data.adelanto !== undefined
          ? { adelanto: decimalToCents(new Decimal(data.adelanto)) }
          : {}),
      },
    });

    if (data.adelanto !== undefined && data.adelanto !== before.adelanto) {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "ADJUST",
          entity: "PayrollItem",
          entityId: item.id,
          before,
          after: { horasExtra: updated.horasExtra, adelanto: centsToString(updated.adelanto) },
          summary: `Adelanto del período → ₡${data.adelanto}`,
        },
      });
    }

    revalidatePath("/planilla");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Approves the period: runs the engine over every line with the pinned
 * parameter set, freezes the full breakdown (snapshot + trace) in one
 * transaction and blocks if any line has a validation error.
 */
export async function approvePlanilla(periodId: string): Promise<ActionResult> {
  try {
    const user = await requirePermissionAction("planilla.aprobar");

    const period = await prisma.payrollPeriod.findUniqueOrThrow({
      where: { id: periodId },
      include: { items: { include: { employee: { include: { contracts: true, adjustments: true } } } } },
    });
    if (period.status !== "BORRADOR") {
      return { ok: false, error: "Este período ya fue aprobado." };
    }
    if (period.items.length === 0) {
      return { ok: false, error: "No hay líneas en el período: agregá al menos un empleado." };
    }

    const params = toPlainParams(await getParameterSetById(period.parameterSetId));

    const updates = period.items.map((item) => {
      const contract =
        item.employee.contracts.find((c) => c.id === item.contractId) ??
        contractInForce(item.employee.contracts, period.startDate, period.endDate);
      if (!contract) {
        throw new Error(`${item.employee.fullName} no tiene contrato vigente para el período.`);
      }
      const result = computeLine(
        {
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
        },
        item.horasExtra,
        centsToString(item.adelanto),
        params,
      );
      if (result.error) {
        throw new Error(`${item.employee.fullName}: ${result.error}`);
      }
      return { item, contract, result };
    });

    await prisma.$transaction(async (tx) => {
      for (const { item, contract, result } of updates) {
        await tx.payrollItem.update({
          where: { id: item.id },
          data: {
            contractId: contract.id,
            salarioBaseSnap: contract.baseSalary,
            salaryUnitSnap: contract.salaryUnit,
            mensualEquivalente: decimalToCents(result.mensualEquivalente),
            basePeriodo: decimalToCents(result.basePeriodo),
            montoHoraExtra: decimalToCents(result.montoHoraExtra),
            montoExtra: decimalToCents(result.montoExtra),
            bruto: decimalToCents(result.bruto),
            ccssSem: decimalToCents(result.ccssSem),
            ccssIvm: decimalToCents(result.ccssIvm),
            ccssBp: decimalToCents(result.ccssBp),
            ccssTotal: decimalToCents(result.ccssTotal),
            renta: decimalToCents(result.renta),
            solidarista: decimalToCents(result.solidarista),
            embargo: decimalToCents(result.embargo),
            otrasDeducciones: decimalToCents(result.otrasDeducciones),
            totalDeducciones: decimalToCents(result.totalDeducciones),
            neto: decimalToCents(result.neto),
            trace: result.trace.map((t) => ({ ...t })),
          },
        });
      }
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: "APROBADA", approvedById: user.id, approvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "APPROVE",
          entity: "PayrollPeriod",
          entityId: period.id,
          after: {
            lineas: updates.length,
            netoTotal: updates
              .reduce((acc, u) => acc.plus(u.result.neto), new Decimal(0))
              .toFixed(2),
          },
          summary: `Planilla aprobada (${updates.length} líneas)`,
        },
      });
    });

    const netoTotal = updates.reduce((acc, u) => acc.plus(u.result.neto), new Decimal(0));
    await notify({
      userIds: await ownerIds(user.id),
      type: "PLANILLA_APROBADA",
      title: `Planilla aprobada · ${periodLabel(period)}`,
      body: `${updates.length} líneas por ${formatCRC(netoTotal)} netos. Aprobada por ${user.name}. Los montos quedaron congelados.`,
      link: "/planilla",
    });

    revalidatePath("/planilla");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marks one or many lines as paid (or reverts them). */
export async function markPaid(itemIds: string[], pagado: boolean): Promise<ActionResult> {
  try {
    const user = await requirePermissionAction("pagos.marcar");
    if (itemIds.length === 0) return { ok: false, error: "Ninguna fila seleccionada." };

    const items = await prisma.payrollItem.findMany({
      where: { id: { in: itemIds } },
      include: { employee: true, period: true },
    });
    if (items.length !== itemIds.length) {
      return { ok: false, error: "Alguna línea ya no existe. Recargá la página." };
    }

    const today = todayCR();
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.payrollItem.update({
          where: { id: item.id },
          data: {
            paymentStatus: pagado ? "PAGADO" : "PENDIENTE",
            paidAt: pagado ? today : null,
            paymentMethod: pagado ? "Transferencia" : null,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: pagado ? "PAY" : "REVERT",
            entity: "PayrollItem",
            entityId: item.id,
            before: { paymentStatus: item.paymentStatus, paidAt: item.paidAt },
            after: { paymentStatus: pagado ? "PAGADO" : "PENDIENTE", paidAt: pagado ? today : null },
            summary: `${pagado ? "Pago aplicado" : "Pago revertido"} · ${item.employee.fullName}`,
          },
        });
      }

      // An APROBADA period where every line is paid becomes PAGADA (and back).
      const periodIds = [...new Set(items.map((i) => i.periodId))];
      for (const periodId of periodIds) {
        const period = items.find((i) => i.periodId === periodId)!.period;
        if (period.status === "BORRADOR") continue;
        const pending = await tx.payrollItem.count({
          where: { periodId, paymentStatus: "PENDIENTE" },
        });
        await tx.payrollPeriod.update({
          where: { id: periodId },
          data: { status: pending === 0 ? "PAGADA" : "APROBADA" },
        });
      }
    });

    // Each paid employee with portal access gets their own notice
    if (pagado) {
      await Promise.all(
        items.map(async (item) => {
          const userIds = await userIdForEmployee(item.employeeId);
          if (userIds.length === 0) return;
          await notify({
            userIds,
            type: "PAGO_APLICADO",
            title: "Te aplicaron el pago del período",
            body:
              `${periodLabel(item.period)} · neto ${item.neto != null ? formatCRC(centsToString(item.neto)) : "por confirmar"}` +
              ` · aplicado el ${formatDateCR(today)}.`,
            link: "/mi",
          });
        }),
      );
    }

    revalidatePath("/planilla");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
