import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { auth } from "./auth";
import {
  resolvePermission,
  type AppRole,
  type PermissionKey,
} from "./permissions";

/**
 * Server-side authorization. Every page calls requirePermission* and EVERY
 * Server Action calls requirePermissionAction — hiding buttons client-side is
 * never the security boundary (prompt-01 hard rule).
 *
 * The user's role/active flag is re-read from the DB (the JWT may be stale
 * after a role change) and the RolePermission overrides are loaded fresh —
 * both memoized per request with React cache().
 */

export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.active) return null;
  return user;
});

const getPermissionOverrides = cache(() => prisma.rolePermission.findMany());

export async function hasPermission(role: AppRole, key: PermissionKey): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true;
  const overrides = await getPermissionOverrides();
  return resolvePermission(role, key, overrides);
}

/** Pages: redirect to login when unauthenticated. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Pages: redirect home when the role lacks the permission. */
export async function requirePermission(key: PermissionKey) {
  const user = await requireUser();
  if (!(await hasPermission(user.role, key))) {
    redirect(user.role === "EMPLEADO" ? "/mi" : "/panel");
  }
  return user;
}

/** Server Actions and Route Handlers: throw instead of redirecting. */
export async function requirePermissionAction(key: PermissionKey) {
  const user = await getSessionUser();
  if (!user) throw new Error("La sesión expiró. Iniciá sesión de nuevo.");
  if (!(await hasPermission(user.role, key))) {
    throw new Error("No tenés permiso para esta acción.");
  }
  return user;
}
