"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionAction } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { formatDateCR } from "@/lib/format/dates";

export type FeriadoActionResult = { ok: true } | { ok: false; error: string };

function failFer(error: unknown): FeriadoActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

const feriadoSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(2, "Poné el nombre del feriado."),
  pagoObligatorio: z.boolean(),
  esTrasladable: z.boolean(),
  recurrenteAnual: z.boolean(),
});

export async function createHoliday(
  raw: z.infer<typeof feriadoSchema>,
): Promise<FeriadoActionResult> {
  try {
    const user = await requirePermissionAction("feriados.crud");
    const values = feriadoSchema.parse(raw);

    const dup = await prisma.holiday.findUnique({ where: { date: values.date } });
    if (dup) {
      return { ok: false, error: `El ${formatDateCR(values.date)} ya está registrado (${dup.name}).` };
    }

    const holiday = await prisma.holiday.create({
      data: { ...values, year: Number(values.date.slice(0, 4)) },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "CREATE",
        entity: "Holiday",
        entityId: holiday.id,
        after: { fecha: values.date, nombre: values.name, pagoObligatorio: values.pagoObligatorio },
        summary: `Feriado creado · ${values.name} (${formatDateCR(values.date)})`,
      },
    });

    revalidatePath("/feriados");
    revalidatePath("/vacaciones");
    return { ok: true };
  } catch (e) {
    return failFer(e);
  }
}

export async function updateHoliday(
  id: string,
  raw: z.infer<typeof feriadoSchema>,
): Promise<FeriadoActionResult> {
  try {
    const user = await requirePermissionAction("feriados.crud");
    const values = feriadoSchema.parse(raw);

    const before = await prisma.holiday.findUniqueOrThrow({ where: { id } });
    await prisma.holiday.update({
      where: { id },
      data: { ...values, year: Number(values.date.slice(0, 4)) },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPDATE",
        entity: "Holiday",
        entityId: id,
        before: { nombre: before.name, pagoObligatorio: before.pagoObligatorio },
        after: { nombre: values.name, pagoObligatorio: values.pagoObligatorio },
        summary: `Feriado actualizado · ${values.name}`,
      },
    });

    revalidatePath("/feriados");
    revalidatePath("/vacaciones");
    return { ok: true };
  } catch (e) {
    return failFer(e);
  }
}

export async function deleteHoliday(id: string): Promise<FeriadoActionResult> {
  try {
    const user = await requirePermissionAction("feriados.crud");
    const holiday = await prisma.holiday.findUniqueOrThrow({ where: { id } });
    await prisma.holiday.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "DELETE",
        entity: "Holiday",
        entityId: id,
        before: { fecha: holiday.date, nombre: holiday.name },
        summary: `Feriado eliminado · ${holiday.name} (${formatDateCR(holiday.date)})`,
      },
    });
    revalidatePath("/feriados");
    revalidatePath("/vacaciones");
    return { ok: true };
  } catch (e) {
    return failFer(e);
  }
}

/**
 * Copies the recurring holidays of a year into the next one (same day/month).
 * Movable feasts (recurrenteAnual = false, e.g. Semana Santa) are skipped and
 * reported so they get entered by hand.
 */
export async function duplicateYear(fromYear: number): Promise<
  FeriadoActionResult | { ok: true; copied: number; skipped: string[] }
> {
  try {
    const user = await requirePermissionAction("feriados.crud");
    const source = await prisma.holiday.findMany({ where: { year: fromYear } });
    if (source.length === 0) {
      return { ok: false, error: `No hay feriados registrados en ${fromYear}.` };
    }

    const toYear = fromYear + 1;
    let copied = 0;
    const skipped: string[] = [];
    for (const h of source) {
      if (!h.recurrenteAnual) {
        skipped.push(h.name);
        continue;
      }
      const newDate = `${toYear}${h.date.slice(4)}`;
      const exists = await prisma.holiday.findUnique({ where: { date: newDate } });
      if (exists) continue;
      await prisma.holiday.create({
        data: {
          date: newDate,
          name: h.name,
          pagoObligatorio: h.pagoObligatorio,
          esTrasladable: h.esTrasladable,
          recurrenteAnual: true,
          year: toYear,
        },
      });
      copied++;
    }

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "CREATE",
        entity: "Holiday",
        entityId: String(toYear),
        after: { copiados: copied, pendientes: skipped },
        summary: `Feriados ${fromYear} duplicados a ${toYear} (${copied} copiados)`,
      },
    });

    revalidatePath("/feriados");
    revalidatePath("/vacaciones");
    return { ok: true, copied, skipped };
  } catch (e) {
    return failFer(e);
  }
}
