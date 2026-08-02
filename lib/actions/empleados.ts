"use server";

import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { requirePermissionAction } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { decimalToCents } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { todayCR } from "@/lib/format/dates";
import {
  employeeFormSchema,
  validateEmployeeForm,
  type EmployeeFormValues,
} from "@/lib/empleados/form";
import { currentPeriodKey } from "@/lib/planilla/periods";

export type EmployeeActionResult =
  | { ok: true; employeeId: string }
  | { ok: false; error: string; fields?: string[] };

const money = (raw: string): Decimal => new Decimal(raw.replace(/\./g, "").replace(",", "."));

function failEmp(error: unknown): EmployeeActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

/** Alta (README modal): the employee enters the current draft period on save. */
export async function createEmployee(raw: EmployeeFormValues): Promise<EmployeeActionResult> {
  try {
    const user = await requirePermissionAction("empleados.crud");
    const values = employeeFormSchema.parse(raw);
    const invalid = validateEmployeeForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const dup = await prisma.employee.findUnique({ where: { cedula: values.cedula } });
    if (dup) {
      return {
        ok: false,
        error: `Ya existe un empleado con la cédula ${values.cedula} (${dup.fullName}).`,
        fields: ["cedula"],
      };
    }

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          fullName: values.nombre,
          cedula: values.cedula,
          position: values.puesto || "Sin puesto",
          hireDate: values.ingreso,
          phone: values.telefono || null,
          iban: values.iban || null,
          status: "ACTIVO",
        },
      });
      const contract = await tx.employmentContract.create({
        data: {
          employeeId: emp.id,
          baseSalary: decimalToCents(money(values.salarioBase)),
          salaryUnit: values.modalidad,
          validFrom: values.ingreso,
        },
      });
      if (values.solidarista !== "" && Number(values.solidarista) > 0) {
        await tx.payrollAdjustment.create({
          data: {
            employeeId: emp.id,
            type: "SOLIDARISTA",
            mode: "PORCENTAJE_BRUTO",
            ratePct: Number(values.solidarista),
            recurring: true,
            validFrom: values.ingreso,
            createdById: user.id,
          },
        });
      }
      if (values.embargo !== "" && money(values.embargo).gt(0)) {
        await tx.payrollAdjustment.create({
          data: {
            employeeId: emp.id,
            type: "EMBARGO",
            mode: "MONTO_FIJO",
            amount: decimalToCents(money(values.embargo)),
            recurring: true,
            validFrom: values.ingreso,
            note: "orden judicial",
            createdById: user.id,
          },
        });
      }

      // "Entra en la planilla del período actual apenas se guarde."
      const period = await tx.payrollPeriod.findUnique({
        where: { year_month_numero_type: { ...currentPeriodKey(), type: "QUINCENAL" } },
      });
      if (period && period.status === "BORRADOR") {
        await tx.payrollItem.create({
          data: { periodId: period.id, employeeId: emp.id, contractId: contract.id },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CREATE",
          entity: "Employee",
          entityId: emp.id,
          after: { nombre: values.nombre, cedula: values.cedula, modalidad: values.modalidad, salarioBase: values.salarioBase },
          summary: `Empleado creado · ${values.nombre}`,
        },
      });
      return emp;
    });

    revalidatePath("/empleados");
    revalidatePath("/planilla");
    revalidatePath("/panel");
    return { ok: true, employeeId: employee.id };
  } catch (e) {
    return failEmp(e);
  }
}

/**
 * Edición. A salary/modality change never overwrites: it closes the current
 * contract and opens a new one (historic salary, prompt-01 hard rule).
 */
export async function updateEmployee(
  employeeId: string,
  raw: EmployeeFormValues,
): Promise<EmployeeActionResult> {
  try {
    const user = await requirePermissionAction("empleados.crud");
    const values = employeeFormSchema.parse(raw);
    const invalid = validateEmployeeForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id: employeeId },
      include: { contracts: true, adjustments: true },
    });
    const today = todayCR();
    const current = employee.contracts
      .filter((c) => c.validTo === null)
      .sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0];

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          fullName: values.nombre,
          cedula: values.cedula,
          position: values.puesto || employee.position,
          hireDate: values.ingreso,
          phone: values.telefono || null,
          iban: values.iban || null,
        },
      });

      const newSalary = decimalToCents(money(values.salarioBase));
      if (current && (current.baseSalary !== newSalary || current.salaryUnit !== values.modalidad)) {
        await tx.employmentContract.update({
          where: { id: current.id },
          data: { validTo: today },
        });
        const fresh = await tx.employmentContract.create({
          data: {
            employeeId,
            baseSalary: newSalary,
            salaryUnit: values.modalidad,
            validFrom: today,
          },
        });
        // Current draft period line now points at the new contract
        const period = await tx.payrollPeriod.findUnique({
          where: { year_month_numero_type: { ...currentPeriodKey(), type: "QUINCENAL" } },
        });
        if (period && period.status === "BORRADOR") {
          await tx.payrollItem.updateMany({
            where: { periodId: period.id, employeeId },
            data: { contractId: fresh.id },
          });
        }
        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "UPDATE",
            entity: "EmploymentContract",
            entityId: fresh.id,
            before: { salarioBase: current.baseSalary.toString(), modalidad: current.salaryUnit },
            after: { salarioBase: newSalary.toString(), modalidad: values.modalidad },
            summary: `Cambio salarial · ${values.nombre}`,
          },
        });
      }

      // Recurring solidarista/embargo follow the form values
      await syncRecurringAdjustment(tx, employee, "SOLIDARISTA", values, user.id, today);
      await syncRecurringAdjustment(tx, employee, "EMBARGO", values, user.id, today);

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "UPDATE",
          entity: "Employee",
          entityId: employeeId,
          before: { nombre: employee.fullName, cedula: employee.cedula },
          after: { nombre: values.nombre, cedula: values.cedula },
          summary: `Empleado actualizado · ${values.nombre}`,
        },
      });
    });

    revalidatePath("/empleados");
    revalidatePath("/planilla");
    revalidatePath("/panel");
    return { ok: true, employeeId };
  } catch (e) {
    return failEmp(e);
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function syncRecurringAdjustment(
  tx: Tx,
  employee: { id: string; adjustments: { id: string; type: string; deletedAt: Date | null; recurring: boolean }[] },
  type: "SOLIDARISTA" | "EMBARGO",
  values: EmployeeFormValues,
  actorId: string,
  today: string,
) {
  const active = employee.adjustments.find(
    (a) => a.type === type && a.recurring && a.deletedAt === null,
  );
  const raw = type === "SOLIDARISTA" ? values.solidarista : values.embargo;
  const has = raw !== "" && Number(raw.replace(/\./g, "").replace(",", ".")) > 0;

  if (!has && active) {
    await tx.payrollAdjustment.update({
      where: { id: active.id },
      data: { deletedAt: new Date(), validTo: today },
    });
    return;
  }
  if (has) {
    const data =
      type === "SOLIDARISTA"
        ? { ratePct: Number(raw), amount: null }
        : { amount: decimalToCents(money(raw)), ratePct: null };
    if (active) {
      await tx.payrollAdjustment.update({ where: { id: active.id }, data });
    } else {
      await tx.payrollAdjustment.create({
        data: {
          employeeId: employee.id,
          type,
          mode: type === "SOLIDARISTA" ? "PORCENTAJE_BRUTO" : "MONTO_FIJO",
          ...data,
          recurring: true,
          validFrom: today,
          note: type === "EMBARGO" ? "orden judicial" : null,
          createdById: actorId,
        },
      });
    }
  }
}

/** Baja suave: soft delete + exit date; history and approved periods stay intact. */
export async function deactivateEmployee(employeeId: string): Promise<EmployeeActionResult> {
  try {
    const user = await requirePermissionAction("empleados.crud");
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
    const today = todayCR();

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { deletedAt: new Date(), exitDate: today, status: "LIQUIDADO" },
      });
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "DELETE",
          entity: "Employee",
          entityId: employeeId,
          before: { estado: employee.status },
          after: { estado: "LIQUIDADO", salida: today },
          summary: `Empleado dado de baja · ${employee.fullName}`,
        },
      });
    });

    revalidatePath("/empleados");
    revalidatePath("/planilla");
    revalidatePath("/panel");
    const next = await prisma.employee.findFirst({
      where: { ...notDeleted },
      orderBy: { fullName: "asc" },
    });
    return { ok: true, employeeId: next?.id ?? "" };
  } catch (e) {
    return failEmp(e);
  }
}
