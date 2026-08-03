/**
 * Declarative, configurable permission matrix.
 *
 * - The KEYS and their metadata live here (typed registry, one per screen/action).
 * - The DEFAULTS below seed the RolePermission collection.
 * - SUPER_ADMIN always has every permission (hardcoded bypass — it can never
 *   lock itself out, and its rows are ignored).
 * - ADMIN / EMPLEADO effective permissions = DB rows (editable by SUPER_ADMIN
 *   in Configuración → Permisos) falling back to these defaults.
 *
 * This module is pure (no Prisma) so it is client-safe and unit-testable.
 * The DB-backed check lives in lib/auth/access.ts.
 */

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "EMPLEADO";

export interface PermissionMeta {
  /** Label shown in the Configuración → Permisos matrix. */
  label: string;
  group: string;
}

export const PERMISSIONS = {
  "panel.ver": { label: "Ver el panel principal", group: "Panel" },
  "planilla.ver": { label: "Ver la planilla", group: "Planilla" },
  "planilla.editar": { label: "Editar horas extra y adelantos", group: "Planilla" },
  "planilla.aprobar": { label: "Aprobar la planilla", group: "Planilla" },
  "pagos.marcar": { label: "Marcar pagos como realizados", group: "Planilla" },
  "colillas.generar": { label: "Generar colillas", group: "Planilla" },
  "empleados.ver": { label: "Ver empleados", group: "Empleados" },
  "empleados.crud": { label: "Crear y editar empleados", group: "Empleados" },
  "vacaciones.ver": { label: "Ver el calendario de vacaciones", group: "Vacaciones" },
  "vacaciones.registrar": { label: "Registrar vacaciones", group: "Vacaciones" },
  "vacaciones.aprobar": { label: "Aprobar solicitudes", group: "Vacaciones" },
  "vacaciones.ajustar": { label: "Ajustar saldos manualmente", group: "Vacaciones" },
  "feriados.crud": { label: "Administrar feriados", group: "Vacaciones" },
  "clientes.ver": { label: "Ver clientes", group: "Clientes y proyectos" },
  "clientes.crud": { label: "Crear y editar clientes", group: "Clientes y proyectos" },
  "proyectos.ver": { label: "Ver proyectos", group: "Clientes y proyectos" },
  "proyectos.crud": { label: "Crear y editar proyectos", group: "Clientes y proyectos" },
  "abonos.registrar": { label: "Registrar abonos", group: "Clientes y proyectos" },
  "gastos.crud": { label: "Registrar gastos y viáticos", group: "Clientes y proyectos" },
  "reportes.generar": { label: "Generar reportes", group: "Reportes" },
  "simulador.usar": { label: "Usar el simulador de salarios", group: "Reportes" },
  "configuracion.parametros": { label: "Editar parámetros de planilla", group: "Configuración" },
  "usuarios.gestionar": { label: "Gestionar usuarios", group: "Configuración" },
  "permisos.gestionar": { label: "Editar esta matriz de permisos", group: "Configuración" },
  "auditoria.ver": { label: "Ver la bitácora de auditoría", group: "Configuración" },
  "portal.propio": { label: "Ver su propio portal (colillas, vacaciones, proyectos)", group: "Portal del empleado" },
} as const satisfies Record<string, PermissionMeta>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/**
 * Seed defaults. Per the owner's decision, ADMIN starts with everything
 * operational; only user/permission management and the audit log stay
 * SUPER_ADMIN-only (all of it editable later from the UI).
 */
export const DEFAULT_MATRIX: Record<Exclude<AppRole, "SUPER_ADMIN">, Record<PermissionKey, boolean>> = {
  ADMIN: {
    "panel.ver": true,
    "planilla.ver": true,
    "planilla.editar": true,
    "planilla.aprobar": true,
    "pagos.marcar": true,
    "colillas.generar": true,
    "empleados.ver": true,
    "empleados.crud": true,
    "vacaciones.ver": true,
    "vacaciones.registrar": true,
    "vacaciones.aprobar": true,
    "vacaciones.ajustar": true,
    "feriados.crud": true,
    "clientes.ver": true,
    "clientes.crud": true,
    "proyectos.ver": true,
    "proyectos.crud": true,
    "abonos.registrar": true,
    "gastos.crud": true,
    "reportes.generar": true,
    "simulador.usar": true,
    "configuracion.parametros": true,
    "usuarios.gestionar": false,
    "permisos.gestionar": false,
    "auditoria.ver": false,
    "portal.propio": false,
  },
  EMPLEADO: {
    "panel.ver": false,
    "planilla.ver": false,
    "planilla.editar": false,
    "planilla.aprobar": false,
    "pagos.marcar": false,
    "colillas.generar": false,
    "empleados.ver": false,
    "empleados.crud": false,
    "vacaciones.ver": false,
    "vacaciones.registrar": false,
    "vacaciones.aprobar": false,
    "vacaciones.ajustar": false,
    "feriados.crud": false,
    "clientes.ver": false,
    "clientes.crud": false,
    "proyectos.ver": false,
    "proyectos.crud": false,
    "abonos.registrar": false,
    "gastos.crud": false,
    "reportes.generar": false,
    "simulador.usar": false,
    "configuracion.parametros": false,
    "usuarios.gestionar": false,
    "permisos.gestionar": false,
    "auditoria.ver": false,
    "portal.propio": true,
  },
};

export interface PermissionOverride {
  role: AppRole;
  permissionKey: string;
  allowed: boolean;
}

/**
 * Pure resolver: SUPER_ADMIN bypasses everything; other roles use the DB
 * override when present, otherwise the seed default; unknown keys deny.
 */
export function resolvePermission(
  role: AppRole,
  key: PermissionKey,
  overrides: readonly PermissionOverride[],
): boolean {
  if (role === "SUPER_ADMIN") return true;
  const override = overrides.find((o) => o.role === role && o.permissionKey === key);
  if (override) return override.allowed;
  return DEFAULT_MATRIX[role][key] ?? false;
}
