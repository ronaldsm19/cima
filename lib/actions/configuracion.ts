"use server";

import bcrypt from "bcryptjs";
import { Decimal } from "decimal.js";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermissionAction } from "@/lib/auth/access";
import { ALL_PERMISSION_KEYS, type PermissionKey } from "@/lib/auth/permissions";
import { decimalToCents } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";

export type ConfigResult = { ok: true } | { ok: false; error: string };

function failCfg(error: unknown): ConfigResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

// ── Parámetros de planilla ───────────────────────────────────────────────────

const bracketSchema = z.object({
  limiteInferior: z.string(),
  limiteSuperior: z.string().nullable(),
  tasaPct: z.number().min(0).max(100),
});

const paramSetSchema = z.object({
  label: z.string().trim().min(3, "Poné una etiqueta al período fiscal."),
  vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vigenteHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  tasaSem: z.number().min(0).max(30),
  tasaIvm: z.number().min(0).max(30),
  tasaBp: z.number().min(0).max(30),
  horaExtraFactor: z.number().min(1).max(3),
  horasMensuales: z.number().int().min(1).max(400),
  factorSemanalAMensual: z.number().min(1).max(10),
  creditoFiscalHijoMensual: z.string(),
  creditoFiscalConyugeMensual: z.string(),
  vacacionesDiasPorMes: z.number().min(0).max(5),
  isrBrackets: z.array(bracketSchema).min(1),
});

export type ParamSetValues = z.infer<typeof paramSetSchema>;

/**
 * Creates a NEW parameter set (never edits one in use): approved periods pin
 * their parameterSetId, so history stays reproducible. The previous current
 * set gets closed the day before the new one starts.
 */
export async function createParameterSet(raw: ParamSetValues): Promise<ConfigResult> {
  try {
    const user = await requirePermissionAction("configuracion.parametros");
    const values = paramSetSchema.parse(raw);

    const brackets = values.isrBrackets
      .slice()
      .sort((a, b) => new Decimal(a.limiteInferior).cmp(new Decimal(b.limiteInferior)));
    for (let i = 1; i < brackets.length; i++) {
      if (new Decimal(brackets[i].limiteInferior).lte(brackets[i - 1].limiteInferior)) {
        return { ok: false, error: "Los tramos de renta tienen que ir de menor a mayor, sin repetir." };
      }
    }

    await prisma.$transaction(async (tx) => {
      const previo = await tx.payrollParameterSet.findFirst({
        where: { ...(values.vigenteDesde ? {} : {}) },
        orderBy: { vigenteDesde: "desc" },
      });
      const set = await tx.payrollParameterSet.create({
        data: {
          label: values.label,
          vigenteDesde: values.vigenteDesde,
          vigenteHasta: values.vigenteHasta,
          tasaSem: values.tasaSem,
          tasaIvm: values.tasaIvm,
          tasaBp: values.tasaBp,
          horaExtraFactor: values.horaExtraFactor,
          horasMensuales: values.horasMensuales,
          factorSemanalAMensual: values.factorSemanalAMensual,
          creditoFiscalHijoMensual: decimalToCents(new Decimal(values.creditoFiscalHijoMensual || "0")),
          creditoFiscalConyugeMensual: decimalToCents(
            new Decimal(values.creditoFiscalConyugeMensual || "0"),
          ),
          vacacionesDiasPorMes: values.vacacionesDiasPorMes,
        },
      });
      for (const [i, b] of brackets.entries()) {
        await tx.isrBracket.create({
          data: {
            parameterSetId: set.id,
            orden: i,
            limiteInferior: decimalToCents(new Decimal(b.limiteInferior)),
            limiteSuperior: b.limiteSuperior ? decimalToCents(new Decimal(b.limiteSuperior)) : null,
            tasaPct: b.tasaPct,
          },
        });
      }
      // Close the previous open set the day before this one starts
      if (previo && previo.vigenteHasta === null && previo.vigenteDesde < values.vigenteDesde) {
        const d = new Date(`${values.vigenteDesde}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 1);
        await tx.payrollParameterSet.update({
          where: { id: previo.id },
          data: { vigenteHasta: d.toISOString().slice(0, 10) },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "CREATE",
          entity: "PayrollParameterSet",
          entityId: set.id,
          after: {
            label: values.label,
            desde: values.vigenteDesde,
            ccss: values.tasaSem + values.tasaIvm + values.tasaBp,
            tramos: brackets.length,
          },
          summary: `Parámetros de planilla creados · ${values.label}`,
        },
      });
    });

    revalidatePath("/configuracion");
    revalidatePath("/planilla");
    return { ok: true };
  } catch (e) {
    return failCfg(e);
  }
}

// ── Usuarios ─────────────────────────────────────────────────────────────────

const userSchema = z.object({
  email: z.string().email("El correo no es válido."),
  name: z.string().trim().min(3, "Poné el nombre completo."),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EMPLEADO"]),
  employeeId: z.string().nullable(),
  password: z.string().optional(),
});

export type UserValues = z.infer<typeof userSchema>;

export async function createUser(raw: UserValues): Promise<ConfigResult> {
  try {
    const actor = await requirePermissionAction("usuarios.gestionar");
    const values = userSchema.parse(raw);
    if (!values.password || values.password.length < 10) {
      return { ok: false, error: "La contraseña tiene que tener al menos 10 caracteres." };
    }
    const email = values.email.toLowerCase().trim();
    if (await prisma.user.findUnique({ where: { email } })) {
      return { ok: false, error: `Ya existe un usuario con el correo ${email}.` };
    }
    if (values.role === "EMPLEADO" && !values.employeeId) {
      return { ok: false, error: "Un usuario EMPLEADO tiene que estar enlazado a una ficha." };
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: values.name,
        role: values.role,
        employeeId: values.employeeId,
        passwordHash: await bcrypt.hash(values.password, 10),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "CREATE",
        entity: "User",
        entityId: user.id,
        after: { email, rol: values.role },
        summary: `Usuario creado · ${email} (${values.role})`,
      },
    });

    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return failCfg(e);
  }
}

export async function updateUser(userId: string, raw: UserValues): Promise<ConfigResult> {
  try {
    const actor = await requirePermissionAction("usuarios.gestionar");
    const values = userSchema.parse(raw);
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // The last active SUPER_ADMIN can't be demoted — that would lock everyone out
    if (before.role === "SUPER_ADMIN" && values.role !== "SUPER_ADMIN") {
      const otros = await prisma.user.count({
        where: { role: "SUPER_ADMIN", active: true, id: { not: userId } },
      });
      if (otros === 0) {
        return {
          ok: false,
          error: "Este es el único dueño activo: dejalo con acceso total o creá otro antes de cambiarlo.",
        };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        email: values.email.toLowerCase().trim(),
        name: values.name,
        role: values.role,
        employeeId: values.employeeId,
        ...(values.password && values.password.length >= 10
          ? { passwordHash: await bcrypt.hash(values.password, 10) }
          : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE",
        entity: "User",
        entityId: userId,
        before: { email: before.email, rol: before.role },
        after: { email: values.email, rol: values.role, cambioClave: Boolean(values.password) },
        summary: `Usuario actualizado · ${values.email}`,
      },
    });

    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return failCfg(e);
  }
}

export async function toggleUserActive(userId: string, active: boolean): Promise<ConfigResult> {
  try {
    const actor = await requirePermissionAction("usuarios.gestionar");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!active && user.role === "SUPER_ADMIN") {
      const otros = await prisma.user.count({
        where: { role: "SUPER_ADMIN", active: true, id: { not: userId } },
      });
      if (otros === 0) {
        return { ok: false, error: "No podés desactivar al único dueño con acceso total." };
      }
    }
    if (!active && userId === actor.id) {
      return { ok: false, error: "No podés desactivar tu propio usuario." };
    }

    await prisma.user.update({ where: { id: userId }, data: { active } });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE",
        entity: "User",
        entityId: userId,
        after: { activo: active },
        summary: `Usuario ${active ? "activado" : "desactivado"} · ${user.email}`,
      },
    });

    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    return failCfg(e);
  }
}

// ── Matriz de permisos ───────────────────────────────────────────────────────

export async function setPermission(
  role: "ADMIN" | "EMPLEADO",
  permissionKey: string,
  allowed: boolean,
): Promise<ConfigResult> {
  try {
    const actor = await requirePermissionAction("permisos.gestionar");
    if (!ALL_PERMISSION_KEYS.includes(permissionKey as PermissionKey)) {
      return { ok: false, error: "Ese permiso no existe." };
    }

    await prisma.rolePermission.upsert({
      where: { role_permissionKey: { role, permissionKey } },
      update: { allowed },
      create: { role, permissionKey, allowed },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: "UPDATE",
        entity: "RolePermission",
        entityId: `${role}:${permissionKey}`,
        after: { rol: role, permiso: permissionKey, permitido: allowed },
        summary: `Permiso ${allowed ? "concedido" : "revocado"} · ${role} → ${permissionKey}`,
      },
    });

    // Permissions are read on every request through a cached query
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return failCfg(e);
  }
}
