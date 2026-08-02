import "server-only";
import { Decimal } from "decimal.js";
import { notDeleted } from "@/lib/db/filters";
import { centsToDecimal } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { vacationBalance } from "@/lib/db/vacations";
import { formatDateCR, todayCR } from "@/lib/format/dates";
import { calculateAguinaldo } from "@/lib/payroll/aguinaldo";
import { periodLabel } from "@/lib/planilla/periods";
import { PROJECT_STATUS } from "@/lib/projects/status";
import type { ReportSpec } from "./workbook";

/**
 * The eight reports from prompt-01 §8. Every builder returns a ReportSpec; the
 * route handler turns it into an .xlsx. Amounts are plain numbers here because
 * Excel needs numeric cells to apply the ₡ format and compute totals — the
 * conversion from BigInt cents happens once, at the boundary.
 */

const num = (d: Decimal) => Number(d.toFixed(2));
const cents = (b: bigint | null) => (b == null ? 0 : num(centsToDecimal(b)));

export type ReportKey =
  | "planilla-periodo"
  | "pagos-empleado"
  | "resumen-anual"
  | "cuentas-por-cobrar"
  | "ingresos-por-tipo"
  | "proyectos-abiertos"
  | "vacaciones"
  | "rentabilidad";

export interface ReportParams {
  periodId?: string;
  employeeId?: string;
  year?: number;
  desde?: string;
  hasta?: string;
}

export async function buildReport(key: ReportKey, params: ReportParams): Promise<ReportSpec> {
  switch (key) {
    case "planilla-periodo":
      return planillaPorPeriodo(params);
    case "pagos-empleado":
      return pagosPorEmpleado(params);
    case "resumen-anual":
      return resumenAnual(params);
    case "cuentas-por-cobrar":
      return cuentasPorCobrar();
    case "ingresos-por-tipo":
      return ingresosPorTipo(params);
    case "proyectos-abiertos":
      return proyectosAbiertos();
    case "vacaciones":
      return reporteVacaciones();
    case "rentabilidad":
      return rentabilidad(params);
  }
}

// 1 · Planilla por período (detalle bruto/deducciones/neto por empleado)
async function planillaPorPeriodo(params: ReportParams): Promise<ReportSpec> {
  const period = params.periodId
    ? await prisma.payrollPeriod.findUnique({ where: { id: params.periodId } })
    : await prisma.payrollPeriod.findFirst({
        where: { status: { not: "BORRADOR" } },
        orderBy: [{ year: "desc" }, { month: "desc" }, { numero: "desc" }],
      });
  if (!period) {
    return empty("planilla-periodo", "Planilla por período", "No hay períodos aprobados todavía");
  }

  const items = await prisma.payrollItem.findMany({
    where: { periodId: period.id },
    include: { employee: true },
  });
  const rows = items
    .sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName, "es"))
    .map((i) => ({
      empleado: i.employee.fullName,
      cedula: i.employee.cedula,
      modalidad: i.salaryUnitSnap ?? "—",
      base: cents(i.basePeriodo),
      extra: cents(i.montoExtra),
      bruto: cents(i.bruto),
      ccss: cents(i.ccssTotal),
      renta: cents(i.renta),
      solidarista: cents(i.solidarista),
      embargo: cents(i.embargo),
      adelanto: cents(i.adelanto),
      neto: cents(i.neto),
      estado: i.paymentStatus === "PAGADO" ? "pagado" : "pendiente",
      pagadoEl: i.paidAt ? formatDateCR(i.paidAt) : "",
    }));

  return {
    fileName: "planilla",
    title: `Planilla · ${periodLabel(period)}`,
    subtitle: `Estado: ${period.status.toLowerCase()} · pago ${formatDateCR(period.payDate)}`,
    sheetName: "Planilla",
    columns: [
      { header: "Empleado", key: "empleado", width: 28 },
      { header: "Cédula", key: "cedula", width: 14 },
      { header: "Modalidad", key: "modalidad", width: 12 },
      { header: "Base del período", key: "base", width: 16, kind: "money", total: true },
      { header: "Horas extra", key: "extra", width: 14, kind: "money", total: true },
      { header: "Bruto", key: "bruto", width: 15, kind: "money", total: true },
      { header: "CCSS", key: "ccss", width: 14, kind: "money", total: true },
      { header: "Renta", key: "renta", width: 13, kind: "money", total: true },
      { header: "Solidarista", key: "solidarista", width: 14, kind: "money", total: true },
      { header: "Pensión alim.", key: "embargo", width: 14, kind: "money", total: true },
      { header: "Adelanto", key: "adelanto", width: 13, kind: "money", total: true },
      { header: "Neto", key: "neto", width: 16, kind: "money", total: true },
      { header: "Estado", key: "estado", width: 12 },
      { header: "Pagado el", key: "pagadoEl", width: 13 },
    ],
    rows,
    totalsLabel: `Total · ${rows.length} empleados`,
    params: [{ label: "Período", value: periodLabel(period) }],
  };
}

// 2 · Pagos realizados a un empleado en un rango
async function pagosPorEmpleado(params: ReportParams): Promise<ReportSpec> {
  const employee = params.employeeId
    ? await prisma.employee.findUnique({ where: { id: params.employeeId } })
    : await prisma.employee.findFirst({ where: { ...notDeleted }, orderBy: { fullName: "asc" } });
  if (!employee) return empty("pagos-empleado", "Pagos por empleado", "No hay empleados");

  const desde = params.desde ?? `${todayCR().slice(0, 4)}-01-01`;
  const hasta = params.hasta ?? todayCR();

  const items = await prisma.payrollItem.findMany({
    where: { employeeId: employee.id, neto: { not: null } },
    include: { period: true },
  });
  const rows = items
    .filter((i) => i.period.payDate >= desde && i.period.payDate <= hasta)
    .sort((a, b) => (a.period.startDate < b.period.startDate ? -1 : 1))
    .map((i) => ({
      periodo: periodLabel(i.period),
      pago: formatDateCR(i.period.payDate),
      bruto: cents(i.bruto),
      ccss: cents(i.ccssTotal),
      renta: cents(i.renta),
      otras: cents(i.solidarista) + cents(i.embargo) + cents(i.otrasDeducciones),
      adelanto: cents(i.adelanto),
      neto: cents(i.neto),
      estado: i.paymentStatus === "PAGADO" ? "pagado" : "pendiente",
    }));

  return {
    fileName: `pagos-${employee.cedula}`,
    title: `Pagos · ${employee.fullName}`,
    subtitle: `Del ${formatDateCR(desde)} al ${formatDateCR(hasta)}`,
    sheetName: "Pagos",
    columns: [
      { header: "Período", key: "periodo", width: 30 },
      { header: "Fecha de pago", key: "pago", width: 15 },
      { header: "Bruto", key: "bruto", width: 15, kind: "money", total: true },
      { header: "CCSS", key: "ccss", width: 14, kind: "money", total: true },
      { header: "Renta", key: "renta", width: 13, kind: "money", total: true },
      { header: "Otras ded.", key: "otras", width: 14, kind: "money", total: true },
      { header: "Adelanto", key: "adelanto", width: 13, kind: "money", total: true },
      { header: "Neto", key: "neto", width: 16, kind: "money", total: true },
      { header: "Estado", key: "estado", width: 12 },
    ],
    rows,
    params: [
      { label: "Empleado", value: `${employee.fullName} (${employee.cedula})` },
      { label: "Puesto", value: employee.position },
    ],
  };
}

// 3 · Resumen anual por empleado (aguinaldo y declaraciones)
async function resumenAnual(params: ReportParams): Promise<ReportSpec> {
  const year = params.year ?? Number(todayCR().slice(0, 4));
  const employees = await prisma.employee.findMany({
    where: { ...notDeleted },
    include: { payrollItems: { include: { period: true } } },
    orderBy: { fullName: "asc" },
  });

  const rows = employees.map((e) => {
    // Aguinaldo window: Dec 1 of the previous year through Nov 30
    const enVentana = e.payrollItems.filter(
      (i) =>
        i.neto != null &&
        i.period.payDate >= `${year - 1}-12-01` &&
        i.period.payDate <= `${year}-11-30`,
    );
    const brutos = enVentana.map((i) => centsToDecimal(i.bruto!));
    const delAnio = e.payrollItems.filter(
      (i) => i.neto != null && i.period.payDate.startsWith(String(year)),
    );
    return {
      empleado: e.fullName,
      cedula: e.cedula,
      periodos: delAnio.length,
      bruto: num(delAnio.reduce((a, i) => a.plus(centsToDecimal(i.bruto!)), new Decimal(0))),
      ccss: num(delAnio.reduce((a, i) => a.plus(centsToDecimal(i.ccssTotal!)), new Decimal(0))),
      renta: num(delAnio.reduce((a, i) => a.plus(centsToDecimal(i.renta!)), new Decimal(0))),
      neto: num(delAnio.reduce((a, i) => a.plus(centsToDecimal(i.neto!)), new Decimal(0))),
      aguinaldo: num(calculateAguinaldo(brutos)),
    };
  });

  return {
    fileName: `resumen-anual-${year}`,
    title: `Resumen anual por empleado · ${year}`,
    subtitle: "El aguinaldo toma los brutos del 1 de diciembre al 30 de noviembre",
    sheetName: "Resumen",
    columns: [
      { header: "Empleado", key: "empleado", width: 28 },
      { header: "Cédula", key: "cedula", width: 14 },
      { header: "Períodos", key: "periodos", width: 10, kind: "num", total: true },
      { header: "Bruto del año", key: "bruto", width: 17, kind: "money", total: true },
      { header: "CCSS", key: "ccss", width: 15, kind: "money", total: true },
      { header: "Renta", key: "renta", width: 14, kind: "money", total: true },
      { header: "Neto", key: "neto", width: 17, kind: "money", total: true },
      { header: "Aguinaldo", key: "aguinaldo", width: 16, kind: "money", total: true },
    ],
    rows,
    params: [
      { label: "Año", value: String(year) },
      { label: "Nota", value: "El aguinaldo no está sujeto a cargas sociales ni a renta." },
    ],
  };
}

// 4 · Cuentas por cobrar por cliente
async function cuentasPorCobrar(): Promise<ReportSpec> {
  const today = todayCR();
  const projects = await prisma.project.findMany({
    where: { ...notDeleted, status: { notIn: ["ENTREGADO", "CANCELADO"] } },
    include: { client: true, payments: true },
  });

  const rows = projects
    .map((p) => ({ p, d: projectDerived(p, p.payments, today) }))
    .filter(({ d }) => d.saldoPendiente.gt(0))
    .sort((a, b) => {
      if (a.d.vencido !== b.d.vencido) return a.d.vencido ? -1 : 1;
      return a.p.client.name.localeCompare(b.p.client.name, "es");
    })
    .map(({ p, d }) => ({
      cliente: p.client.name,
      cedula: p.client.cedula,
      codigo: p.code,
      trabajo: p.description ?? p.type,
      contratado: num(centsToDecimal(p.agreedAmount)),
      abonado: num(d.totalAbonado),
      saldo: num(d.saldoPendiente),
      primaCubierta: d.primaCubierta ? "sí" : "no",
      entrega: p.dueDate ? formatDateCR(p.dueDate) : "",
      estado: d.vencido ? `vencido (${d.diasVencido} días)` : PROJECT_STATUS[p.status].label,
    }));

  return {
    fileName: "cuentas-por-cobrar",
    title: "Cuentas por cobrar",
    subtitle: "Proyectos abiertos con saldo pendiente, vencidos primero",
    sheetName: "Por cobrar",
    columns: [
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Cédula", key: "cedula", width: 15 },
      { header: "Código", key: "codigo", width: 14 },
      { header: "Trabajo", key: "trabajo", width: 28 },
      { header: "Contratado", key: "contratado", width: 16, kind: "money", total: true },
      { header: "Abonado", key: "abonado", width: 16, kind: "money", total: true },
      { header: "Saldo", key: "saldo", width: 16, kind: "money", total: true },
      { header: "Prima cubierta", key: "primaCubierta", width: 14 },
      { header: "Entrega", key: "entrega", width: 13 },
      { header: "Estado", key: "estado", width: 20 },
    ],
    rows,
  };
}

// 5 · Ingresos por período y por tipo de trabajo
async function ingresosPorTipo(params: ReportParams): Promise<ReportSpec> {
  const desde = params.desde ?? `${todayCR().slice(0, 4)}-01-01`;
  const hasta = params.hasta ?? todayCR();

  const payments = await prisma.clientPayment.findMany({
    where: { ...notDeleted, date: { gte: desde, lte: hasta } },
    include: { project: { include: { client: true } } },
    orderBy: { date: "asc" },
  });

  const porTipo = new Map<string, { monto: Decimal; abonos: number }>();
  for (const p of payments) {
    const tipo = PROJECT_STATUS_TYPE_LABEL[p.project.type] ?? p.project.type;
    const prev = porTipo.get(tipo) ?? { monto: new Decimal(0), abonos: 0 };
    porTipo.set(tipo, {
      monto: prev.monto.plus(centsToDecimal(p.amount)),
      abonos: prev.abonos + 1,
    });
  }

  const rows = [...porTipo.entries()]
    .sort((a, b) => b[1].monto.cmp(a[1].monto))
    .map(([tipo, v]) => ({ tipo, abonos: v.abonos, monto: num(v.monto) }));

  return {
    fileName: "ingresos-por-tipo",
    title: "Ingresos por tipo de trabajo",
    subtitle: `Abonos recibidos del ${formatDateCR(desde)} al ${formatDateCR(hasta)}`,
    sheetName: "Ingresos",
    columns: [
      { header: "Tipo de trabajo", key: "tipo", width: 30 },
      { header: "Abonos", key: "abonos", width: 12, kind: "num", total: true },
      { header: "Ingresos", key: "monto", width: 18, kind: "money", total: true },
    ],
    rows,
    params: [
      { label: "Desde", value: formatDateCR(desde) },
      { label: "Hasta", value: formatDateCR(hasta) },
    ],
  };
}

const PROJECT_STATUS_TYPE_LABEL: Record<string, string> = {
  LEVANTAMIENTO: "Levantamiento topográfico",
  PLANO_CATASTRADO: "Plano catastrado",
  REPLANTEO: "Replanteo",
  DESLINDE: "Deslinde",
  AMOJONAMIENTO: "Amojonamiento",
  CURVAS_NIVEL: "Curvas de nivel",
  VISADO_MUNICIPAL: "Visado municipal",
  SEGREGACION: "Segregación",
  CATASTRO: "Catastro",
  OTRO: "Otro",
};

// 6 · Proyectos abiertos con antigüedad y saldo
async function proyectosAbiertos(): Promise<ReportSpec> {
  const today = todayCR();
  const projects = await prisma.project.findMany({
    where: { ...notDeleted, status: { notIn: ["ENTREGADO", "CANCELADO"] } },
    include: { client: true, payments: true },
    orderBy: { code: "asc" },
  });

  const rows = projects.map((p) => {
    const d = projectDerived(p, p.payments, today);
    const dias = p.startDate
      ? Math.round(
          (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${p.startDate}T00:00:00Z`).getTime()) /
            86_400_000,
        )
      : 0;
    return {
      codigo: p.code,
      cliente: p.client.name,
      trabajo: p.description ?? p.type,
      finca: p.fincaFolio ?? "",
      estado: d.vencido ? "vencido" : PROJECT_STATUS[p.status].label,
      antiguedad: dias,
      entrega: p.dueDate ? formatDateCR(p.dueDate) : "",
      contratado: num(centsToDecimal(p.agreedAmount)),
      saldo: num(d.saldoPendiente),
    };
  });

  return {
    fileName: "proyectos-abiertos",
    title: "Proyectos abiertos",
    subtitle: "Antigüedad en días desde que se abrió el trabajo",
    sheetName: "Proyectos",
    columns: [
      { header: "Código", key: "codigo", width: 14 },
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Trabajo", key: "trabajo", width: 28 },
      { header: "Finca / plano", key: "finca", width: 20 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Días abierto", key: "antiguedad", width: 13, kind: "num" },
      { header: "Entrega", key: "entrega", width: 13 },
      { header: "Contratado", key: "contratado", width: 16, kind: "money", total: true },
      { header: "Saldo", key: "saldo", width: 16, kind: "money", total: true },
    ],
    rows,
  };
}

// 7 · Saldos y días disfrutados de vacaciones
async function reporteVacaciones(): Promise<ReportSpec> {
  const today = todayCR();
  const employees = await prisma.employee.findMany({
    where: { ...notDeleted, status: "ACTIVO" },
    orderBy: { fullName: "asc" },
  });

  const rows = await Promise.all(
    employees.map(async (e) => {
      const b = await vacationBalance(e.id, e.hireDate, today);
      return {
        empleado: e.fullName,
        cedula: e.cedula,
        ingreso: formatDateCR(e.hireDate),
        acumulado: b.acumulado,
        tomados: b.tomados,
        saldo: b.saldo,
        alerta: b.saldo >= 20 ? "acumulación alta" : "",
      };
    }),
  );

  return {
    fileName: "vacaciones",
    title: "Saldos de vacaciones",
    subtitle: "Devengado por ley + ajustes manuales − días disfrutados",
    sheetName: "Vacaciones",
    columns: [
      { header: "Empleado", key: "empleado", width: 28 },
      { header: "Cédula", key: "cedula", width: 14 },
      { header: "Ingreso", key: "ingreso", width: 13 },
      { header: "Acumulado", key: "acumulado", width: 13, kind: "num", total: true },
      { header: "Tomados", key: "tomados", width: 12, kind: "num", total: true },
      { header: "Saldo", key: "saldo", width: 12, kind: "num", total: true },
      { header: "Alerta", key: "alerta", width: 18 },
    ],
    rows,
  };
}

// 8 · Rentabilidad por proyecto (ingresos − gastos)
async function rentabilidad(params: ReportParams): Promise<ReportSpec> {
  const desde = params.desde ?? `${todayCR().slice(0, 4)}-01-01`;
  const hasta = params.hasta ?? todayCR();
  const projects = await prisma.project.findMany({
    where: { ...notDeleted },
    include: { client: true, payments: true, expenses: true },
    orderBy: { code: "desc" },
  });

  const rows = projects
    .filter((p) => (p.startDate ?? p.createdAt.toISOString().slice(0, 10)) <= hasta)
    .map((p) => {
      const d = projectDerived(p, p.payments, todayCR());
      const gastos = p.expenses
        .filter((g) => g.deletedAt === null)
        .reduce((acc, g) => acc.plus(centsToDecimal(g.amount)), new Decimal(0));
      const viaticos = p.expenses
        .filter((g) => g.deletedAt === null && g.type === "VIATICO")
        .reduce((acc, g) => acc.plus(centsToDecimal(g.amount)), new Decimal(0));
      const acordado = centsToDecimal(p.agreedAmount);
      return {
        codigo: p.code,
        cliente: p.client.name,
        trabajo: p.description ?? p.type,
        acordado: num(acordado),
        abonado: num(d.totalAbonado),
        gastos: num(gastos),
        viaticos: num(viaticos),
        rentabilidad: num(acordado.minus(gastos)),
        margen: acordado.isZero()
          ? 0
          : Number(acordado.minus(gastos).div(acordado).mul(100).toFixed(1)),
      };
    });

  return {
    fileName: "rentabilidad",
    title: "Rentabilidad por proyecto",
    subtitle: `Monto acordado menos gastos y viáticos · hasta ${formatDateCR(hasta)}`,
    sheetName: "Rentabilidad",
    columns: [
      { header: "Código", key: "codigo", width: 14 },
      { header: "Cliente", key: "cliente", width: 28 },
      { header: "Trabajo", key: "trabajo", width: 28 },
      { header: "Acordado", key: "acordado", width: 16, kind: "money", total: true },
      { header: "Abonado", key: "abonado", width: 16, kind: "money", total: true },
      { header: "Gastos", key: "gastos", width: 15, kind: "money", total: true },
      { header: "de los cuales viáticos", key: "viaticos", width: 20, kind: "money", total: true },
      { header: "Rentabilidad", key: "rentabilidad", width: 17, kind: "money", total: true },
      { header: "Margen %", key: "margen", width: 11, kind: "num" },
    ],
    rows,
    params: [
      { label: "Desde", value: formatDateCR(desde) },
      { label: "Hasta", value: formatDateCR(hasta) },
    ],
  };
}

function empty(fileName: string, title: string, subtitle: string): ReportSpec {
  return {
    fileName,
    title,
    subtitle,
    sheetName: "Sin datos",
    columns: [{ header: "Sin datos", key: "vacio", width: 40 }],
    rows: [],
  };
}
