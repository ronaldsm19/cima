"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionAction } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";

export type AsignacionResult = { ok: true } | { ok: false; error: string };

/** Assigns an employee to a project (feeds the EMPLEADO portal's "mis proyectos"). */
export async function asignarEmpleado(
  projectId: string,
  employeeId: string,
  roleInProject: string,
): Promise<AsignacionResult> {
  try {
    const user = await requirePermissionAction("proyectos.crud");
    const [project, employee] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
    ]);

    const existing = await prisma.projectAssignment.findUnique({
      where: { projectId_employeeId: { projectId, employeeId } },
    });
    if (existing) {
      return { ok: false, error: `${employee.fullName} ya está asignado a ${project.code}.` };
    }

    await prisma.projectAssignment.create({
      data: { projectId, employeeId, roleInProject: roleInProject || null },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPDATE",
        entity: "ProjectAssignment",
        entityId: projectId,
        after: { proyecto: project.code, empleado: employee.fullName, rol: roleInProject },
        summary: `${employee.fullName} asignado a ${project.code}`,
      },
    });

    revalidatePath("/proyectos");
    revalidatePath("/mi");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo asignar." };
  }
}

export async function quitarAsignacion(
  projectId: string,
  employeeId: string,
): Promise<AsignacionResult> {
  try {
    const user = await requirePermissionAction("proyectos.crud");
    const [project, employee] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
    ]);

    await prisma.projectAssignment.deleteMany({ where: { projectId, employeeId } });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPDATE",
        entity: "ProjectAssignment",
        entityId: projectId,
        before: { proyecto: project.code, empleado: employee.fullName },
        summary: `${employee.fullName} quitado de ${project.code}`,
      },
    });

    revalidatePath("/proyectos");
    revalidatePath("/mi");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo quitar." };
  }
}
