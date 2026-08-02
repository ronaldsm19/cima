import { Decimal } from "decimal.js";
import { hasPermission } from "@/lib/auth/access";
import type { AppRole } from "@/lib/auth/permissions";
import { notDeleted } from "@/lib/db/filters";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { projectDerived } from "@/lib/db/projectTotals";
import { todayCR } from "@/lib/format/dates";
import { projectPill } from "@/lib/projects/status";
import type { ClientFormValues } from "./form";
import type { PillTone } from "@/components/ds/Pill";

export interface ClienteProyectoRow {
  id: string;
  code: string;
  trabajo: string;
  fincaPlano: string;
  contratado: string; // decimal strings
  abonado: string;
  saldo: string;
  pill: { label: string; tone: PillTone };
  vencido: boolean;
}

export interface FichaClienteDTO {
  id: string;
  nombre: string;
  cedula: string;
  kind: "FISICA" | "JURIDICA";
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  notas: string | null;
  contratado: string;
  abonado: string;
  saldoPendiente: string;
  tieneVencidos: boolean;
  proyectos: ClienteProyectoRow[];
  form: ClientFormValues & { clientId: string };
  permisos: { crud: boolean };
}

export async function listClientChips() {
  const clients = await prisma.client.findMany({
    where: { ...notDeleted },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return clients.map((c) => ({ id: c.id, nombre: c.name }));
}

export async function getFichaCliente(
  clientId: string,
  role: AppRole,
): Promise<FichaClienteDTO | null> {
  const today = todayCR();
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      projects: {
        where: { ...notDeleted },
        include: { payments: true },
        orderBy: { code: "desc" },
      },
    },
  });
  if (!client || client.deletedAt !== null) return null;

  let contratado = 0n;
  let tieneVencidos = false;
  let abonadoAcc = new Decimal(0);
  let saldoAcc = new Decimal(0);
  const rows: ClienteProyectoRow[] = [];

  for (const p of client.projects) {
    const d = projectDerived(p, p.payments, today);
    contratado += p.agreedAmount;
    abonadoAcc = abonadoAcc.plus(d.totalAbonado);
    saldoAcc = saldoAcc.plus(d.saldoPendiente);
    if (d.vencido) tieneVencidos = true;
    rows.push({
      id: p.id,
      code: p.code,
      trabajo: p.description ?? p.type,
      fincaPlano: p.fincaFolio ?? p.planoNumber ?? "—",
      contratado: centsToString(p.agreedAmount),
      abonado: d.totalAbonado.toFixed(2),
      saldo: d.saldoPendiente.toFixed(2),
      pill: projectPill(p.status, d.vencido),
      vencido: d.vencido,
    });
  }

  const crud = await hasPermission(role, "clientes.crud");

  return {
    id: client.id,
    nombre: client.name,
    cedula: client.cedula,
    kind: client.kind,
    contacto: client.contactName,
    telefono: client.phone,
    email: client.email,
    notas: client.notes,
    contratado: centsToString(contratado),
    abonado: abonadoAcc.toFixed(2),
    saldoPendiente: saldoAcc.toFixed(2),
    tieneVencidos,
    proyectos: rows,
    form: {
      clientId: client.id,
      kind: client.kind,
      nombre: client.name,
      cedula: client.cedula,
      contacto: client.contactName ?? "",
      telefono: client.phone ?? "",
      email: client.email ?? "",
      notas: client.notes ?? "",
    },
    permisos: { crud },
  };
}
