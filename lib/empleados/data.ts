import { Decimal } from "decimal.js";
import { hasPermission } from "@/lib/auth/access";
import type { AppRole } from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { getParameterSetFor, toPlainParams } from "@/lib/db/params";
import { prisma } from "@/lib/db/prisma";
import { vacationBalance } from "@/lib/db/vacations";
import { formatDateCR, fullMonthsBetween, todayCR } from "@/lib/format/dates";
import { toEngineParams } from "@/lib/payroll/params";
import { mensualEquivalente } from "@/lib/payroll/engine";
import { computeLine } from "@/lib/planilla/compute";
import { adjustmentsForPeriod, contractInForce } from "@/lib/planilla/data";
import { currentPeriodKey, periodLabel } from "@/lib/planilla/periods";
import type { FichaEmpleadoDTO } from "./dto";

function antiguedadLabel(hireDate: string, today: string): string {
  const months = fullMonthsBetween(hireDate, today);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} mes${rest !== 1 ? "es" : ""}`;
  if (rest === 0) return `${years} año${years !== 1 ? "s" : ""}`;
  return `${years} año${years !== 1 ? "s" : ""} ${rest} mes${rest !== 1 ? "es" : ""}`;
}

export async function listEmployeeChips() {
  const employees = await prisma.employee.findMany({
    where: { ...notDeleted },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
  return employees.map((e) => ({ id: e.id, nombre: e.fullName }));
}

export async function getFichaEmpleado(
  employeeId: string,
  role: AppRole,
): Promise<FichaEmpleadoDTO | null> {
  const today = todayCR();
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      contracts: true,
      adjustments: true,
      payrollItems: {
        where: { neto: { not: null } },
        include: { period: true },
      },
      vacationRequests: {
        where: { status: { in: ["APROBADA", "DISFRUTADA"] } },
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!employee || employee.deletedAt !== null) return null;

  const contract = contractInForce(employee.contracts, today, today)
    ?? employee.contracts.sort((a, b) => (a.validFrom < b.validFrom ? 1 : -1))[0];
  if (!contract) return null;

  const paramSet = await getParameterSetFor(today);
  const params = toPlainParams(paramSet);
  const engineParams = toEngineParams(params);

  const salarioBase = centsToString(contract.baseSalary);
  const mensualEq = mensualEquivalente(
    contract.salaryUnit,
    new Decimal(salarioBase),
    engineParams,
  ).toDecimalPlaces(2);

  // Recurring deductions in force
  const solidarista = employee.adjustments.find(
    (a) => a.type === "SOLIDARISTA" && a.recurring && a.deletedAt === null,
  );
  const embargo = employee.adjustments.find(
    (a) => a.type === "EMBARGO" && a.recurring && a.deletedAt === null,
  );

  // Current-period line (for renta / adelanto vigente)
  const currentPeriod = await prisma.payrollPeriod.findUnique({
    where: { year_month_numero_type: { ...currentPeriodKey(), type: "QUINCENAL" } },
  });
  const currentItem = currentPeriod
    ? await prisma.payrollItem.findUnique({
        where: { periodId_employeeId: { periodId: currentPeriod.id, employeeId } },
      })
    : null;

  const line = computeLine(
    {
      modalidad: contract.salaryUnit,
      salarioBase,
      numHijos: employee.numHijos,
      tieneConyuge: employee.tieneConyuge,
      adjustments: currentPeriod
        ? adjustmentsForPeriod(
            employee.adjustments,
            currentPeriod.id,
            currentPeriod.startDate,
            currentPeriod.endDate,
          )
        : [],
    },
    currentItem?.horasExtra ?? 0,
    "0",
    params,
  );

  const vac = await vacationBalance(employeeId, employee.hireDate, today);
  const tasaCcss = new Decimal(String(params.tasaSem))
    .plus(String(params.tasaIvm))
    .plus(String(params.tasaBp));

  const historial = employee.payrollItems
    .filter((i) => i.period.status !== "BORRADOR")
    .sort((a, b) => (a.period.startDate < b.period.startDate ? 1 : -1))
    .slice(0, 6)
    .map((i) => ({
      itemId: i.id,
      periodo: periodLabel(i.period),
      pagadoEl: i.paidAt,
      bruto: centsToString(i.bruto!),
      // "Deducciones" column includes the adelanto so bruto − deducciones = neto
      deducciones: centsToString(i.totalDeducciones! + i.adelanto),
      neto: centsToString(i.neto!),
    }));

  const crud = await hasPermission(role, "empleados.crud");

  return {
    id: employee.id,
    nombre: employee.fullName,
    puesto: employee.position,
    cedula: employee.cedula,
    telefono: employee.phone,
    iban: employee.iban,
    estado: employee.status,
    hireDate: employee.hireDate,
    antiguedad: antiguedadLabel(employee.hireDate, today),
    modalidad: contract.salaryUnit,
    salarioBase,
    mensualEquivalente: mensualEq.toFixed(2),
    solidaristaPct: solidarista?.ratePct ?? null,
    embargo: embargo?.amount != null ? centsToString(embargo.amount) : null,
    vacaciones: vac,
    deducciones: {
      ccssPct: `${tasaCcss.toString().replace(".", ",")} %`,
      rentaPeriodo: line.renta.gt(0) ? line.renta.toFixed(2) : null,
      adelantoVigente:
        currentItem && currentItem.adelanto > 0n ? centsToString(currentItem.adelanto) : null,
    },
    historial,
    vacacionesTomadas: employee.vacationRequests.map((v) => ({
      rango: `${formatDateCR(v.startDate)} – ${formatDateCR(v.endDate)}`,
      nota: v.note,
      dias: v.businessDays,
    })),
    form: {
      employeeId: employee.id,
      nombre: employee.fullName,
      cedula: employee.cedula,
      puesto: employee.position,
      modalidad: contract.salaryUnit,
      salarioBase: new Decimal(salarioBase).toFixed(0),
      ingreso: employee.hireDate,
      iban: employee.iban ?? "",
      telefono: employee.phone ?? "",
      solidarista: solidarista?.ratePct != null ? String(solidarista.ratePct) : "",
      embargo: embargo?.amount != null ? new Decimal(centsToString(embargo.amount)).toFixed(0) : "",
    },
    permisos: { crud },
    params,
  };
}
