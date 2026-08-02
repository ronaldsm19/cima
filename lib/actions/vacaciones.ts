"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionAction } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { vacationBalance } from "@/lib/db/vacations";
import { formatDateCR } from "@/lib/format/dates";
import {
  businessDaysInRange,
  formatDays,
  vacationExcessMessage,
} from "@/lib/payroll/vacations";

export type VacacionesActionResult = { ok: true } | { ok: false; error: string };

function failVac(error: unknown): VacacionesActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

const rangoSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().optional(),
});

/**
 * Registers an approved vacation range for an employee (admin flow).
 * Business days exclude weekends and feriados de ley; the balance check uses
 * the literal README message. SUPER_ADMINs get an in-app notification when
 * someone else registers.
 */
export async function registrarVacaciones(
  raw: z.infer<typeof rangoSchema>,
): Promise<VacacionesActionResult> {
  try {
    const user = await requirePermissionAction("vacaciones.registrar");
    const values = rangoSchema.parse(raw);
    const [startDate, endDate] =
      values.startDate <= values.endDate
        ? [values.startDate, values.endDate]
        : [values.endDate, values.startDate];

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: values.employeeId },
    });

    const holidays = await prisma.holiday.findMany({ select: { date: true } });
    const dias = businessDaysInRange(startDate, endDate, holidays.map((h) => h.date));
    if (dias === 0) {
      return {
        ok: false,
        error: "El rango no tiene días hábiles: solo cae en fines de semana o feriados.",
      };
    }

    const saldo = await vacationBalance(values.employeeId, employee.hireDate);
    if (dias > saldo.saldo) {
      return { ok: false, error: vacationExcessMessage(dias, saldo.saldo, employee.fullName) };
    }

    // Overlap guard: a day can't be taken twice
    const overlap = await prisma.vacationRequest.findFirst({
      where: {
        employeeId: values.employeeId,
        status: { in: ["APROBADA", "DISFRUTADA", "SOLICITADA"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlap) {
      return {
        ok: false,
        error: `${employee.fullName.split(" ")[0]} ya tiene vacaciones registradas del ${formatDateCR(overlap.startDate)} al ${formatDateCR(overlap.endDate)}. Elegí otro rango.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      const request = await tx.vacationRequest.create({
        data: {
          employeeId: values.employeeId,
          startDate,
          endDate,
          businessDays: dias,
          status: "APROBADA",
          approvedById: user.id,
          note: values.note || null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "APPROVE",
          entity: "VacationRequest",
          entityId: request.id,
          after: { empleado: employee.fullName, del: startDate, al: endDate, dias },
          summary: `Vacaciones registradas · ${employee.fullName} · ${formatDays(dias)} días`,
        },
      });
      // Notify the owner when the assistant registers (prompt-01 rule)
      const owners = await tx.user.findMany({
        where: { role: "SUPER_ADMIN", active: true, id: { not: user.id } },
      });
      if (owners.length > 0) {
        await tx.notification.createMany({
          data: owners.map((o) => ({
            userId: o.id,
            type: "VACACION_APROBADA",
            title: `Vacaciones de ${employee.fullName}`,
            body: `${formatDays(dias)} días hábiles · del ${formatDateCR(startDate)} al ${formatDateCR(endDate)} · registrado por ${user.name}`,
            link: "/vacaciones",
          })),
        });
      }
    });

    revalidatePath("/vacaciones");
    revalidatePath("/empleados");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    return failVac(e);
  }
}

const ajusteSchema = z.object({
  employeeId: z.string().min(1),
  days: z.number().min(-60).max(60),
  reason: z.string().trim().min(5, "El motivo es obligatorio (mínimo 5 caracteres)."),
});

/** Manual balance adjustment — mandatory reason, always audited (prompt-01). */
export async function ajustarSaldoVacaciones(
  raw: z.infer<typeof ajusteSchema>,
): Promise<VacacionesActionResult> {
  try {
    const user = await requirePermissionAction("vacaciones.ajustar");
    const values = ajusteSchema.parse(raw);
    if (values.days === 0) {
      return { ok: false, error: "El ajuste no puede ser cero: indicá días a favor o en contra." };
    }

    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: values.employeeId } });
    await prisma.$transaction(async (tx) => {
      const adj = await tx.vacationAdjustment.create({
        data: {
          employeeId: values.employeeId,
          days: values.days,
          reason: values.reason,
          createdById: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "ADJUST",
          entity: "VacationAdjustment",
          entityId: adj.id,
          after: { empleado: employee.fullName, dias: values.days, motivo: values.reason },
          summary: `Ajuste de saldo de vacaciones · ${employee.fullName} · ${values.days > 0 ? "+" : ""}${formatDays(values.days)} días`,
        },
      });
    });

    revalidatePath("/vacaciones");
    revalidatePath("/empleados");
    return { ok: true };
  } catch (e) {
    return failVac(e);
  }
}
