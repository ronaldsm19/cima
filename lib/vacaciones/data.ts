import { hasPermission } from "@/lib/auth/access";
import type { AppRole } from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";
import { vacationBalance } from "@/lib/db/vacations";
import { todayCR } from "@/lib/format/dates";

export interface VacacionesEmpleado {
  id: string;
  nombre: string;
  puesto: string;
  acumulado: number;
  tomados: number;
  saldo: number;
}

export interface VacacionesDTO {
  empleados: VacacionesEmpleado[];
  /** All registered holiday dates (ISO) — the pure calc excludes them. */
  feriados: { date: string; name: string }[];
  /** Two visible months: current and next (prototype layout). */
  meses: { year: number; month: number }[];
  permisos: { registrar: boolean; ajustar: boolean; feriados: boolean };
}

export async function getVacacionesDTO(role: AppRole): Promise<VacacionesDTO> {
  const today = todayCR();
  const [y, m] = today.split("-").map(Number);
  const next = m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 };

  const employees = await prisma.employee.findMany({
    where: { ...notDeleted, status: "ACTIVO" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, position: true, hireDate: true },
  });

  const empleados = await Promise.all(
    employees.map(async (e) => {
      const b = await vacationBalance(e.id, e.hireDate, today);
      return { id: e.id, nombre: e.fullName, puesto: e.position, ...b };
    }),
  );

  const feriados = await prisma.holiday.findMany({
    orderBy: { date: "asc" },
    select: { date: true, name: true },
  });

  const [registrar, ajustar, feriadosPerm] = await Promise.all([
    hasPermission(role, "vacaciones.registrar"),
    hasPermission(role, "vacaciones.ajustar"),
    hasPermission(role, "feriados.crud"),
  ]);

  return {
    empleados,
    feriados,
    meses: [{ year: y, month: m }, next],
    permisos: { registrar, ajustar, feriados: feriadosPerm },
  };
}
