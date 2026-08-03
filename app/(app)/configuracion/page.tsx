import { ParametrosPanel, type ParamSetRow } from "@/components/configuracion/ParametrosPanel";
import { PermisosMatrix } from "@/components/configuracion/PermisosMatrix";
import { UsuariosPanel, type UserRow } from "@/components/configuracion/UsuariosPanel";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import {
  ALL_PERMISSION_KEYS,
  resolvePermission,
  type PermissionKey,
} from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";

export default async function ConfiguracionPage() {
  const user = await requirePermission("configuracion.parametros");

  const [canUsers, canPerms] = await Promise.all([
    hasPermission(user.role, "usuarios.gestionar"),
    hasPermission(user.role, "permisos.gestionar"),
  ]);

  const [sets, periodCounts, users, empleados, overrides] = await Promise.all([
    prisma.payrollParameterSet.findMany({
      include: { isrBrackets: { orderBy: { orden: "asc" } } },
      orderBy: { vigenteDesde: "desc" },
    }),
    prisma.payrollPeriod.groupBy({ by: ["parameterSetId"], _count: true }),
    canUsers
      ? prisma.user.findMany({
          include: { employee: { select: { fullName: true } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.employee.findMany({
      where: { ...notDeleted },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    canPerms ? prisma.rolePermission.findMany() : Promise.resolve([]),
  ]);

  const usoPorSet = new Map(periodCounts.map((p) => [p.parameterSetId, p._count]));

  const paramRows: ParamSetRow[] = sets.map((s) => ({
    id: s.id,
    label: s.label,
    vigenteDesde: s.vigenteDesde,
    vigenteHasta: s.vigenteHasta,
    tasaSem: s.tasaSem,
    tasaIvm: s.tasaIvm,
    tasaBp: s.tasaBp,
    tasaPatronal: s.tasaPatronal,
    horasMensuales: s.horasMensuales,
    horaExtraFactor: s.horaExtraFactor,
    vacacionesDiasPorMes: s.vacacionesDiasPorMes,
    brackets: s.isrBrackets.map((b) => ({
      limiteInferior: centsToString(b.limiteInferior),
      limiteSuperior: b.limiteSuperior != null ? centsToString(b.limiteSuperior) : null,
      tasaPct: b.tasaPct,
    })),
    periodosUsando: usoPorSet.get(s.id) ?? 0,
  }));

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    employeeId: u.employeeId,
    employeeName: u.employee?.fullName ?? null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 10) : null,
  }));

  const effective = {
    ADMIN: Object.fromEntries(
      ALL_PERMISSION_KEYS.map((k) => [k, resolvePermission("ADMIN", k as PermissionKey, overrides)]),
    ),
    EMPLEADO: Object.fromEntries(
      ALL_PERMISSION_KEYS.map((k) => [k, resolvePermission("EMPLEADO", k as PermissionKey, overrides)]),
    ),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ParametrosPanel
        sets={paramRows}
        vigente={paramRows.find((s) => s.vigenteHasta === null) ?? null}
      />
      {canUsers ? (
        <UsuariosPanel
          users={userRows}
          empleados={empleados.map((e) => ({ id: e.id, nombre: e.fullName }))}
        />
      ) : null}
      {canPerms ? <PermisosMatrix effective={effective} /> : null}
    </div>
  );
}
