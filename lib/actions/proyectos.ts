"use server";

import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionAction } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { centsToDecimal, decimalToCents } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { todayCR } from "@/lib/format/dates";
import { parsePositiveCR } from "@/lib/format/number";
import { validateAbono } from "@/lib/projects/abonos";
import {
  projectFormSchema,
  validateProjectForm,
  type ProjectFormValues,
} from "@/lib/proyectos/form";

export type ProjectActionResult =
  | { ok: true; projectId: string; code: string }
  | { ok: false; error: string; fields?: string[] };

const money = parsePositiveCR;

function failProj(error: unknown): ProjectActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

/** Correlative PT-YYYY-NNN over ALL projects of the year (soft-deleted included). */
async function nextProjectCode(year: number): Promise<string> {
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: `PT-${year}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const n = last ? Number(last.code.slice(-3)) + 1 : 1;
  return `PT-${year}-${String(n).padStart(3, "0")}`;
}

export async function createProject(raw: ProjectFormValues): Promise<ProjectActionResult> {
  try {
    const user = await requirePermissionAction("proyectos.crud");
    const values = projectFormSchema.parse(raw);
    const invalid = validateProjectForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const year = Number(todayCR().slice(0, 4));
    const project = await prisma.$transaction(async (tx) => {
      const code = await nextProjectCode(year);
      const p = await tx.project.create({
        data: {
          code,
          clientId: values.clientId,
          type: values.tipo,
          description: values.descripcion || null,
          fincaFolio: values.finca || null,
          planoNumber: values.plano || null,
          status: values.estado,
          startDate: todayCR(),
          dueDate: values.entrega || null,
          agreedAmount: decimalToCents(money(values.monto)),
          primaPct: Number(values.primaPct.replace(",", ".")),
        },
      });
      await tx.projectStatusHistory.create({
        data: { projectId: p.id, fromStatus: null, toStatus: values.estado, changedById: user.id },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CREATE",
          entity: "Project",
          entityId: p.id,
          after: { code, monto: values.monto, primaPct: values.primaPct },
          summary: `Proyecto creado · ${code}`,
        },
      });
      return p;
    });

    revalidatePath("/proyectos");
    revalidatePath("/clientes");
    revalidatePath("/panel");
    return { ok: true, projectId: project.id, code: project.code };
  } catch (e) {
    return failProj(e);
  }
}

export async function updateProject(
  projectId: string,
  raw: ProjectFormValues,
): Promise<ProjectActionResult> {
  try {
    const user = await requirePermissionAction("proyectos.crud");
    const values = projectFormSchema.parse(raw);
    const invalid = validateProjectForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const before = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { payments: true },
    });

    // Never let the agreed amount fall below what was already paid
    const abonado = before.payments
      .filter((p) => p.deletedAt === null)
      .reduce((acc, p) => acc.plus(centsToDecimal(p.amount)), new Decimal(0));
    if (money(values.monto).lt(abonado)) {
      return {
        ok: false,
        error: `El monto acordado no puede ser menor que lo ya abonado (₡${abonado.toFixed(2)}).`,
        fields: ["monto"],
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          clientId: values.clientId,
          type: values.tipo,
          description: values.descripcion || null,
          fincaFolio: values.finca || null,
          planoNumber: values.plano || null,
          status: values.estado,
          dueDate: values.entrega || null,
          deliveredDate:
            values.estado === "ENTREGADO" && before.status !== "ENTREGADO"
              ? todayCR()
              : before.deliveredDate,
          agreedAmount: decimalToCents(money(values.monto)),
          primaPct: Number(values.primaPct.replace(",", ".")),
        },
      });
      if (values.estado !== before.status) {
        await tx.projectStatusHistory.create({
          data: {
            projectId,
            fromStatus: before.status,
            toStatus: values.estado,
            changedById: user.id,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "UPDATE",
          entity: "Project",
          entityId: projectId,
          before: {
            monto: centsToDecimal(before.agreedAmount).toFixed(2),
            estado: before.status,
          },
          after: { monto: money(values.monto).toFixed(2), estado: values.estado },
          summary: `Proyecto actualizado · ${before.code}`,
        },
      });
    });

    revalidatePath("/proyectos");
    revalidatePath("/clientes");
    revalidatePath("/panel");
    return { ok: true, projectId, code: before.code };
  } catch (e) {
    return failProj(e);
  }
}

const abonoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referencia: z.string().trim(),
  monto: z.string().trim(),
});

export async function registrarAbono(
  projectId: string,
  raw: z.infer<typeof abonoSchema>,
): Promise<ProjectActionResult> {
  try {
    const user = await requirePermissionAction("abonos.registrar");
    const values = abonoSchema.parse(raw);

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { payments: true },
    });
    const derived = projectDerived(project, project.payments);
    const monto = money(values.monto || "0");

    // Literal README message on over-payment / non-positive amounts
    const error = validateAbono(monto, derived.saldoPendiente);
    if (error) return { ok: false, error, fields: ["monto"] };

    await prisma.$transaction(async (tx) => {
      const abono = await tx.clientPayment.create({
        data: {
          projectId,
          amount: decimalToCents(monto),
          date: values.fecha,
          reference: values.referencia || null,
          method: values.referencia.toUpperCase().startsWith("SINPE") ? "SINPE" : null,
          receivedById: user.id,
        },
      });
      // A fully paid project that was already delivered closes itself
      const saldoRestante = derived.saldoPendiente.minus(monto);
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CREATE",
          entity: "ClientPayment",
          entityId: abono.id,
          after: {
            proyecto: project.code,
            monto: monto.toFixed(2),
            saldoRestante: saldoRestante.toFixed(2),
          },
          summary: `Abono registrado · ${project.code} · ₡${monto.toFixed(2)}`,
        },
      });
    });

    revalidatePath("/proyectos");
    revalidatePath("/clientes");
    revalidatePath("/panel");
    return { ok: true, projectId, code: project.code };
  } catch (e) {
    return failProj(e);
  }
}

const gastoSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(["GASTO", "VIATICO"]),
  descripcion: z.string().trim().min(1, "Describí el gasto."),
  monto: z.string().trim(),
});

export async function registrarGasto(
  projectId: string,
  raw: z.infer<typeof gastoSchema>,
): Promise<ProjectActionResult> {
  try {
    const user = await requirePermissionAction("gastos.crud");
    const values = gastoSchema.parse(raw);
    const monto = money(values.monto || "0");
    if (monto.lte(0)) {
      return { ok: false, error: "El gasto tiene que ser mayor que cero. Revisá el monto.", fields: ["monto"] };
    }

    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const gasto = await prisma.projectExpense.create({
      data: {
        projectId,
        type: values.tipo,
        description: values.descripcion,
        amount: decimalToCents(monto),
        date: values.fecha,
        registeredById: user.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "CREATE",
        entity: "ProjectExpense",
        entityId: gasto.id,
        after: { proyecto: project.code, tipo: values.tipo, monto: monto.toFixed(2) },
        summary: `${values.tipo === "VIATICO" ? "Viático" : "Gasto"} registrado · ${project.code} · ₡${monto.toFixed(2)}`,
      },
    });

    revalidatePath("/proyectos");
    return { ok: true, projectId, code: project.code };
  } catch (e) {
    return failProj(e);
  }
}

/** Soft delete a project without payments; with payments it must be CANCELADO instead. */
export async function deactivateProject(projectId: string): Promise<ProjectActionResult> {
  try {
    const user = await requirePermissionAction("proyectos.crud");
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { payments: { where: { ...notDeleted } } },
    });
    if (project.payments.length > 0) {
      return {
        ok: false,
        error: `${project.code} tiene abonos registrados: pasalo a "Cancelado" en vez de borrarlo, para no perder el historial financiero.`,
      };
    }
    await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "DELETE",
        entity: "Project",
        entityId: projectId,
        summary: `Proyecto eliminado · ${project.code}`,
      },
    });
    revalidatePath("/proyectos");
    revalidatePath("/clientes");
    return { ok: true, projectId, code: project.code };
  } catch (e) {
    return failProj(e);
  }
}
