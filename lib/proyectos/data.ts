import { Decimal } from "decimal.js";
import { hasPermission } from "@/lib/auth/access";
import type { AppRole } from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { todayCR } from "@/lib/format/dates";
import { listAssignableEmployees } from "@/lib/portal/data";
import { projectPill } from "@/lib/projects/status";
import type { ProjectFormValues } from "./form";
import type { PillTone } from "@/components/ds/Pill";

export interface ProyectoDTO {
  id: string;
  code: string;
  clientId: string;
  clienteNombre: string;
  form: ProjectFormValues;
  // Derived (server-computed, decimal strings)
  abonado: string;
  saldoPendiente: string;
  primaMonto: string;
  primaCubierta: boolean;
  pctCobrado: number;
  vencido: boolean;
  diasVencido: number;
  pill: { label: string; tone: PillTone };
  abonos: { id: string; fecha: string; referencia: string; monto: string; saldoTras: string }[];
  gastos: { id: string; fecha: string; tipo: "GASTO" | "VIATICO"; descripcion: string; monto: string }[];
  gastosTotal: string;
  rentabilidad: string; // monto acordado − gastos
  historialEstados: { de: string | null; a: string; fecha: string }[];
  clientes: { id: string; nombre: string }[];
  asignados: { employeeId: string; nombre: string; rol: string | null }[];
  empleadosDisponibles: { id: string; nombre: string; puesto: string }[];
  permisos: { crud: boolean; abonos: boolean; gastos: boolean };
}

export async function getProyectoDTO(
  projectId: string,
  role: AppRole,
): Promise<ProyectoDTO | null> {
  const today = todayCR();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      payments: { orderBy: { date: "asc" } },
      expenses: { orderBy: { date: "asc" } },
      statusHistory: { orderBy: { changedAt: "asc" } },
      assignments: { include: { employee: { select: { fullName: true } } } },
    },
  });
  if (!project || project.deletedAt !== null) return null;

  const d = projectDerived(project, project.payments, today);

  // Running balance after each abono (README "Saldo tras abono" column)
  const agreed = new Decimal(centsToString(project.agreedAmount));
  let running = agreed;
  const abonos = project.payments
    .filter((p) => p.deletedAt === null)
    .map((p) => {
      const monto = new Decimal(centsToString(p.amount));
      running = running.minus(monto);
      return {
        id: p.id,
        fecha: p.date,
        referencia: p.reference ?? p.method ?? "—",
        monto: monto.toFixed(2),
        saldoTras: running.toFixed(2),
      };
    });

  const gastos = project.expenses
    .filter((g) => g.deletedAt === null)
    .map((g) => ({
      id: g.id,
      fecha: g.date,
      tipo: g.type,
      descripcion: g.description,
      monto: centsToString(g.amount),
    }));
  const gastosTotal = gastos.reduce((acc, g) => acc.plus(g.monto), new Decimal(0));

  const [crud, abonosPerm, gastosPerm] = await Promise.all([
    hasPermission(role, "proyectos.crud"),
    hasPermission(role, "abonos.registrar"),
    hasPermission(role, "gastos.crud"),
  ]);

  const clientes = await prisma.client.findMany({
    where: { ...notDeleted },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return {
    id: project.id,
    code: project.code,
    clientId: project.clientId,
    clienteNombre: project.client.name,
    form: {
      clientId: project.clientId,
      tipo: project.type,
      descripcion: project.description ?? "",
      finca: project.fincaFolio ?? "",
      plano: project.planoNumber ?? "",
      entrega: project.dueDate ?? "",
      monto: new Decimal(centsToString(project.agreedAmount)).toFixed(0),
      primaPct: String(project.primaPct),
      estado: project.status,
    },
    abonado: d.totalAbonado.toFixed(2),
    saldoPendiente: d.saldoPendiente.toFixed(2),
    primaMonto: d.primaMonto.toFixed(2),
    primaCubierta: d.primaCubierta,
    pctCobrado: d.pctCobrado,
    vencido: d.vencido,
    diasVencido: d.diasVencido,
    pill: projectPill(project.status, d.vencido),
    abonos,
    gastos,
    gastosTotal: gastosTotal.toFixed(2),
    rentabilidad: agreed.minus(gastosTotal).toFixed(2),
    historialEstados: project.statusHistory.map((h) => ({
      de: h.fromStatus,
      a: h.toStatus,
      fecha: h.changedAt.toISOString().slice(0, 10),
    })),
    clientes: clientes.map((c) => ({ id: c.id, nombre: c.name })),
    asignados: project.assignments.map((a) => ({
      employeeId: a.employeeId,
      nombre: a.employee.fullName,
      rol: a.roleInProject,
    })),
    empleadosDisponibles: await listAssignableEmployees(),
    permisos: { crud, abonos: abonosPerm, gastos: gastosPerm },
  };
}

/** Blank DTO for /proyectos/nuevo (optionally pre-selecting a client). */
export async function getNuevoProyectoDTO(
  role: AppRole,
  clientId?: string,
): Promise<Pick<ProyectoDTO, "form" | "clientes" | "permisos">> {
  const clientes = await prisma.client.findMany({
    where: { ...notDeleted },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const [crud, abonosPerm, gastosPerm] = await Promise.all([
    hasPermission(role, "proyectos.crud"),
    hasPermission(role, "abonos.registrar"),
    hasPermission(role, "gastos.crud"),
  ]);
  return {
    form: {
      clientId: clientId && clientes.some((c) => c.id === clientId) ? clientId : (clientes[0]?.id ?? ""),
      tipo: "LEVANTAMIENTO",
      descripcion: "",
      finca: "",
      plano: "",
      entrega: "",
      monto: "",
      primaPct: "30",
      estado: "ABIERTO",
    },
    clientes: clientes.map((c) => ({ id: c.id, nombre: c.name })),
    permisos: { crud, abonos: abonosPerm, gastos: gastosPerm },
  };
}

export interface ProyectoListRow {
  id: string;
  code: string;
  cliente: string;
  trabajo: string;
  fincaPlano: string;
  saldo: string;
  entrega: string | null;
  pill: { label: string; tone: PillTone };
}

export async function listProyectos(): Promise<ProyectoListRow[]> {
  const today = todayCR();
  const projects = await prisma.project.findMany({
    where: { ...notDeleted },
    include: { client: true, payments: true },
    orderBy: { code: "desc" },
  });
  return projects.map((p) => {
    const d = projectDerived(p, p.payments, today);
    return {
      id: p.id,
      code: p.code,
      cliente: p.client.name,
      trabajo: p.description ?? p.type,
      fincaPlano: p.fincaFolio ?? p.planoNumber ?? "—",
      saldo: d.saldoPendiente.toFixed(2),
      entrega: p.dueDate,
      pill: projectPill(p.status, d.vencido),
    };
  });
}
