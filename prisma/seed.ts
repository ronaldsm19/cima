/* eslint-disable no-console */
import { PrismaClient, type SalaryUnit, type ProjectStatus, type ProjectType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSION_KEYS, DEFAULT_MATRIX } from "../lib/auth/permissions";
import { PARAMS_2026_SEED } from "../lib/payroll/params";
import { fullMonthsBetween, todayCR } from "../lib/format/dates";

const prisma = new PrismaClient();

/** Integer colones → BigInt cents. */
const cents = (colones: number) => BigInt(Math.round(colones * 100));

/** dd/MM/yyyy → yyyy-MM-dd. */
const iso = (ddmmyyyy: string) => {
  const [d, m, y] = ddmmyyyy.split("/");
  return `${y}-${m}-${d}`;
};

async function seedUsers() {
  const users = [
    {
      email: process.env.SEED_OWNER_EMAIL ?? "dueno@example.com",
      password: process.env.SEED_OWNER_PASSWORD ?? "cambiame-ya",
      name: process.env.SEED_OWNER_NAME ?? "Esteban Morales",
      role: "SUPER_ADMIN" as const,
    },
    {
      email: process.env.SEED_ASSISTANT_EMAIL ?? "asistente@example.com",
      password: process.env.SEED_ASSISTANT_PASSWORD ?? "cambiame-ya",
      name: process.env.SEED_ASSISTANT_NAME ?? "Asistente Administrativa",
      role: "ADMIN" as const,
    },
  ];
  const ids: string[] = [];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const row = await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: { name: u.name, role: u.role },
      create: { email: u.email.toLowerCase(), passwordHash, name: u.name, role: u.role },
    });
    ids.push(row.id);
  }
  console.log(`✓ ${ids.length} usuarios administrativos`);
  return { ownerId: ids[0], assistantId: ids[1] };
}

async function seedPermissions() {
  let count = 0;
  for (const role of ["ADMIN", "EMPLEADO"] as const) {
    for (const key of ALL_PERMISSION_KEYS) {
      await prisma.rolePermission.upsert({
        where: { role_permissionKey: { role, permissionKey: key } },
        update: {}, // never clobber choices made in the UI
        create: { role, permissionKey: key, allowed: DEFAULT_MATRIX[role][key] },
      });
      count++;
    }
  }
  console.log(`✓ matriz de permisos (${count} entradas)`);
}

async function seedParameterSet() {
  const label = "Parámetros 2026";
  let set = await prisma.payrollParameterSet.findFirst({ where: { label } });
  if (!set) {
    // Valores semilla — TODO: verificar contra la normativa vigente (prompt-01)
    set = await prisma.payrollParameterSet.create({
      data: {
        label,
        vigenteDesde: "2026-01-01",
        vigenteHasta: null,
        tasaSem: PARAMS_2026_SEED.tasaSem,
        tasaIvm: PARAMS_2026_SEED.tasaIvm,
        tasaBp: PARAMS_2026_SEED.tasaBp,
        horaExtraFactor: PARAMS_2026_SEED.horaExtraFactor,
        horasMensuales: PARAMS_2026_SEED.horasMensuales,
        factorSemanalAMensual: PARAMS_2026_SEED.factorSemanalAMensual,
        creditoFiscalHijoMensual: 0n,
        creditoFiscalConyugeMensual: 0n,
        vacacionesDiasPorMes: 1.0,
      },
    });
  }
  for (const [i, b] of PARAMS_2026_SEED.isrBrackets.entries()) {
    await prisma.isrBracket.upsert({
      where: { parameterSetId_orden: { parameterSetId: set.id, orden: i } },
      update: {},
      create: {
        parameterSetId: set.id,
        orden: i,
        limiteInferior: cents(Number(b.limiteInferior)),
        limiteSuperior: b.limiteSuperior ? cents(Number(b.limiteSuperior)) : null,
        tasaPct: b.tasaPct,
      },
    });
  }
  console.log(`✓ ${label} + ${PARAMS_2026_SEED.isrBrackets.length} tramos ISR`);
  return set;
}

// Feriados CR 2026 — semilla del prompt-01, TODO: verificar contra normativa
// vigente (art. 148 Código de Trabajo). Semana Santa 2026: 2–3 de abril.
const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "Año Nuevo", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true },
  { date: "2026-04-02", name: "Jueves Santo", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: false },
  { date: "2026-04-03", name: "Viernes Santo", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: false },
  { date: "2026-04-11", name: "Día de Juan Santamaría", pagoObligatorio: true, esTrasladable: true, recurrenteAnual: true },
  { date: "2026-05-01", name: "Día del Trabajador", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true },
  { date: "2026-07-25", name: "Anexión del Partido de Nicoya", pagoObligatorio: true, esTrasladable: true, recurrenteAnual: true },
  { date: "2026-08-02", name: "Virgen de los Ángeles", pagoObligatorio: false, esTrasladable: false, recurrenteAnual: true },
  { date: "2026-08-15", name: "Día de la Madre", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true },
  { date: "2026-09-15", name: "Día de la Independencia", pagoObligatorio: true, esTrasladable: true, recurrenteAnual: true },
  { date: "2026-10-12", name: "Día de las Culturas", pagoObligatorio: false, esTrasladable: true, recurrenteAnual: true },
  { date: "2026-12-01", name: "Abolición del Ejército", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true },
  { date: "2026-12-25", name: "Navidad", pagoObligatorio: true, esTrasladable: false, recurrenteAnual: true },
];

async function seedHolidays() {
  for (const h of HOLIDAYS_2026) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: {},
      create: { ...h, year: 2026 },
    });
  }
  console.log(`✓ ${HOLIDAYS_2026.length} feriados 2026`);
}

// ── Demo data (design prototype, fictional) ─────────────────────────────────

const DEMO_EMPLOYEES = [
  { key: "e1", nom: "Esteban Zúñiga Brenes", puesto: "Topógrafo de campo", ced: "1-0987-0333", ingreso: "01/06/2017", modo: "MENSUAL", base: 1050000, cta: "CR93 0151 0800 1002 4488 91", solid: 5, embargo: 0, vacAcum: 19.5, vacTom: 5, tel: "8712-4409" },
  { key: "e2", nom: "Marvin Rodríguez Quesada", puesto: "Topógrafo asistente", ced: "1-1042-0873", ingreso: "04/03/2019", modo: "MENSUAL", base: 920000, cta: "CR21 0161 0100 1023 8801 55", solid: 5, embargo: 0, vacAcum: 16, vacTom: 10, tel: "8834-2211" },
  { key: "e3", nom: "Josué Vargas Chinchilla", puesto: "Cadenero", ced: "1-1723-0955", ingreso: "10/01/2022", modo: "SEMANAL", base: 118500, cta: "CR47 0151 0800 1009 3320 74", solid: 0, embargo: 52000, vacAcum: 8.5, vacTom: 0, tel: "6042-9917" },
  { key: "e4", nom: "Randall Mora Jiménez", puesto: "Cadenero", ced: "6-0412-0788", ingreso: "02/05/2023", modo: "SEMANAL", base: 112000, cta: "CR03 0161 0100 1044 7712 09", solid: 0, embargo: 0, vacAcum: 6, vacTom: 6, tel: "7108-3355" },
  { key: "e5", nom: "Adrián Céspedes Solano", puesto: "Dibujante CAD", ced: "3-0489-0217", ingreso: "09/11/2020", modo: "QUINCENAL", base: 365000, cta: "CR55 0151 0800 1004 1198 30", solid: 3, embargo: 0, vacAcum: 14, vacTom: 9, tel: "8455-6690" },
  { key: "e6", nom: "Yendry Alfaro Picado", puesto: "Recepción y archivo", ced: "2-0733-0640", ingreso: "19/02/2024", modo: "QUINCENAL", base: 245000, cta: "CR88 0161 0100 1058 0043 12", solid: 0, embargo: 0, vacAcum: 5.5, vacTom: 2, tel: "8901-7724" },
  { key: "e7", nom: "Kimberly Fallas Ureña", puesto: "Asistente administrativa", ced: "1-1588-0421", ingreso: "16/08/2021", modo: "MENSUAL", base: 680000, cta: "CR12 0151 0800 1006 5540 88", solid: 3, embargo: 0, vacAcum: 12, vacTom: 12, tel: "8377-1042" },
  { key: "e8", nom: "Karla Segura Montero", puesto: "Contabilidad · medio tiempo", ced: "4-0221-0119", ingreso: "11/09/2023", modo: "QUINCENAL", base: 310000, cta: "CR69 0161 0100 1061 2287 41", solid: 0, embargo: 0, vacAcum: 7, vacTom: 3, tel: "8620-4478" },
] as const;

const DEMO_CLIENTS = [
  { key: "c1", kind: "JURIDICA", nom: "Constructora Vista Real S.A.", ced: "3-101-482910", contacto: "Ing. Laura Bermúdez", email: "laura@vistareal.cr", tel: "2445-8890" },
  { key: "c2", kind: "JURIDICA", nom: "Municipalidad de Grecia", ced: "3-014-042064", contacto: "Dpto. de Catastro", email: "catastro@grecia.go.cr", tel: "2494-5000" },
  { key: "c3", kind: "JURIDICA", nom: "Ganadera El Cedral S.A.", ced: "3-101-771203", contacto: "Don Álvaro Ugalde · finca El Cedral", email: null, tel: "8844-2019" },
  { key: "c4", kind: "FISICA", nom: "Familia Rojas Ugalde", ced: "2-0518-0334", contacto: "Sra. Marta Rojas · particular", email: null, tel: "8712-9038" },
] as const;

const DEMO_PROJECTS = [
  { key: "p1", cliente: "c3", codigo: "PT-2026-031", tipo: "SEGREGACION", label: "Segregación", finca: "Finca 4-00218745", monto: 1850000, prima: 30, entrega: "30/08/2026", estado: "EN_PROCESO", delivered: null, abonos: [{ fecha: "12/06/2026", ref: "SINPE 8842", monto: 555000 }] },
  { key: "p2", cliente: "c1", codigo: "PT-2026-028", tipo: "LEVANTAMIENTO", label: "Levantamiento topográfico", finca: "Finca 2-00591034", monto: 2400000, prima: 40, entrega: "15/09/2026", estado: "EN_PROCESO", delivered: null, abonos: [{ fecha: "02/07/2026", ref: "Transf. BN 44219", monto: 960000 }] },
  { key: "p3", cliente: "c2", codigo: "PT-2026-024", tipo: "REPLANTEO", label: "Replanteo de urbanización", finca: "Finca 2-00107744", monto: 5600000, prima: 25, entrega: "30/06/2026", estado: "EN_PROCESO", delivered: null, abonos: [{ fecha: "18/04/2026", ref: "Cheque 01188", monto: 1400000 }, { fecha: "22/05/2026", ref: "Transf. BCR 7712", monto: 1400000 }] },
  { key: "p4", cliente: "c4", codigo: "PT-2026-019", tipo: "VISADO_MUNICIPAL", label: "Visado municipal", finca: "Plano C-1284567", monto: 320000, prima: 50, entrega: "28/03/2026", estado: "ENTREGADO", delivered: "28/03/2026", abonos: [{ fecha: "10/03/2026", ref: "Efectivo", monto: 160000 }, { fecha: "28/03/2026", ref: "SINPE 3301", monto: 160000 }] },
  { key: "p5", cliente: "c3", codigo: "PT-2026-012", tipo: "CATASTRO", label: "Catastro", finca: "Finca 2-00443120", monto: 980000, prima: 30, entrega: "20/08/2026", estado: "EN_VISADO", delivered: null, abonos: [{ fecha: "20/02/2026", ref: "SINPE 1194", monto: 294000 }, { fecha: "15/05/2026", ref: "SINPE 2277", monto: 196000 }] },
  { key: "p6", cliente: "c1", codigo: "PT-2026-034", tipo: "REPLANTEO", label: "Replanteo de lotes", finca: "Finca 2-00591035", monto: 1250000, prima: 30, entrega: "12/09/2026", estado: "EN_PROCESO", delivered: null, abonos: [] },
] as const;

/** Historical vacation ranges (fabricated but plausible; businessDays is what counts). */
const DEMO_VACATIONS_TAKEN: Record<string, { start: string; end: string; days: number }[]> = {
  e1: [{ start: "2026-03-02", end: "2026-03-06", days: 5 }],
  e2: [{ start: "2025-12-22", end: "2026-01-02", days: 8 }, { start: "2026-04-06", end: "2026-04-07", days: 2 }],
  e4: [{ start: "2026-02-09", end: "2026-02-16", days: 6 }],
  e5: [{ start: "2025-11-24", end: "2025-12-04", days: 9 }],
  e6: [{ start: "2026-05-04", end: "2026-05-05", days: 2 }],
  e7: [{ start: "2025-12-15", end: "2026-01-02", days: 12 }],
  e8: [{ start: "2026-06-15", end: "2026-06-17", days: 3 }],
};

const DEMO_ASSIGNMENTS: Record<string, { emp: string; role: string }[]> = {
  p1: [{ emp: "e1", role: "Topógrafo de campo" }, { emp: "e3", role: "Cadenero" }],
  p2: [{ emp: "e2", role: "Topógrafo asistente" }, { emp: "e5", role: "Dibujo CAD" }],
  p3: [{ emp: "e1", role: "Topógrafo de campo" }, { emp: "e4", role: "Cadenero" }],
  p5: [{ emp: "e5", role: "Dibujo CAD" }],
  p6: [{ emp: "e3", role: "Cadenero" }],
};

async function seedDemoData(ownerId: string, assistantId: string, parameterSetId: string) {
  const today = todayCR();

  // Employees + contracts + recurring adjustments + vacation records
  const empIds = new Map<string, string>();
  const contractIds = new Map<string, string>();
  for (const e of DEMO_EMPLOYEES) {
    const hireIso = iso(e.ingreso);
    const employee = await prisma.employee.upsert({
      where: { cedula: e.ced },
      update: {},
      create: {
        fullName: e.nom,
        cedula: e.ced,
        position: e.puesto,
        hireDate: hireIso,
        phone: e.tel,
        iban: e.cta,
        status: "ACTIVO",
      },
    });
    empIds.set(e.key, employee.id);

    await prisma.employmentContract.deleteMany({ where: { employeeId: employee.id } });
    const contract = await prisma.employmentContract.create({
      data: {
        employeeId: employee.id,
        baseSalary: cents(e.base),
        salaryUnit: e.modo as SalaryUnit,
        validFrom: hireIso,
      },
    });
    contractIds.set(e.key, contract.id);

    await prisma.payrollAdjustment.deleteMany({ where: { employeeId: employee.id } });
    if (e.solid > 0) {
      await prisma.payrollAdjustment.create({
        data: {
          employeeId: employee.id,
          type: "SOLIDARISTA",
          mode: "PORCENTAJE_BRUTO",
          ratePct: e.solid,
          recurring: true,
          validFrom: hireIso,
          createdById: ownerId,
        },
      });
    }
    if (e.embargo > 0) {
      await prisma.payrollAdjustment.create({
        data: {
          employeeId: employee.id,
          type: "EMBARGO",
          mode: "MONTO_FIJO",
          amount: cents(e.embargo),
          recurring: true,
          validFrom: hireIso,
          note: "orden judicial",
          createdById: ownerId,
        },
      });
    }

    // Opening balance so that accrual(hire→today) + adjustment = prototype vacAcum
    await prisma.vacationAdjustment.deleteMany({ where: { employeeId: employee.id } });
    const accrued = fullMonthsBetween(hireIso, today) * 1.0;
    const opening = e.vacAcum - accrued;
    if (opening !== 0) {
      await prisma.vacationAdjustment.create({
        data: {
          employeeId: employee.id,
          days: opening,
          reason: "Saldo inicial al migrar del control en Excel",
          createdById: ownerId,
        },
      });
    }

    await prisma.vacationRequest.deleteMany({ where: { employeeId: employee.id } });
    for (const v of DEMO_VACATIONS_TAKEN[e.key] ?? []) {
      await prisma.vacationRequest.create({
        data: {
          employeeId: employee.id,
          startDate: v.start,
          endDate: v.end,
          businessDays: v.days,
          status: "DISFRUTADA",
          approvedById: ownerId,
        },
      });
    }
  }
  console.log(`✓ ${DEMO_EMPLOYEES.length} empleados demo con contratos y ajustes`);

  // Clients
  const cliIds = new Map<string, string>();
  for (const c of DEMO_CLIENTS) {
    const existing = await prisma.client.findFirst({ where: { cedula: c.ced } });
    const client =
      existing ??
      (await prisma.client.create({
        data: {
          kind: c.kind,
          name: c.nom,
          cedula: c.ced,
          contactName: c.contacto,
          email: c.email,
          phone: c.tel,
        },
      }));
    cliIds.set(c.key, client.id);
  }
  console.log(`✓ ${DEMO_CLIENTS.length} clientes demo`);

  // Projects + abonos + assignments + status history
  for (const p of DEMO_PROJECTS) {
    const project = await prisma.project.upsert({
      where: { code: p.codigo },
      update: {},
      create: {
        code: p.codigo,
        clientId: cliIds.get(p.cliente)!,
        type: p.tipo as ProjectType,
        description: p.label,
        fincaFolio: p.finca,
        status: p.estado as ProjectStatus,
        dueDate: iso(p.entrega),
        deliveredDate: p.delivered ? iso(p.delivered) : null,
        agreedAmount: cents(p.monto),
        primaPct: p.prima,
      },
    });

    await prisma.clientPayment.deleteMany({ where: { projectId: project.id } });
    for (const a of p.abonos) {
      await prisma.clientPayment.create({
        data: {
          projectId: project.id,
          amount: cents(a.monto),
          date: iso(a.fecha),
          reference: a.ref,
          method: a.ref.startsWith("SINPE") ? "SINPE" : a.ref.startsWith("Transf") ? "Transferencia" : a.ref === "Efectivo" ? "Efectivo" : "Cheque",
          receivedById: assistantId,
        },
      });
    }

    await prisma.projectStatusHistory.deleteMany({ where: { projectId: project.id } });
    await prisma.projectStatusHistory.create({
      data: {
        projectId: project.id,
        fromStatus: null,
        toStatus: p.estado as ProjectStatus,
        changedById: ownerId,
        note: "Estado inicial (seed)",
      },
    });

    await prisma.projectAssignment.deleteMany({ where: { projectId: project.id } });
    for (const a of DEMO_ASSIGNMENTS[p.key] ?? []) {
      await prisma.projectAssignment.create({
        data: {
          projectId: project.id,
          employeeId: empIds.get(a.emp)!,
          roleInProject: a.role,
        },
      });
    }
  }
  console.log(`✓ ${DEMO_PROJECTS.length} proyectos demo con abonos`);

  // Current payroll period: Quincena 2 · 16–31 jul 2026, BORRADOR
  const period = await prisma.payrollPeriod.upsert({
    where: { year_month_numero_type: { year: 2026, month: 7, numero: 2, type: "QUINCENAL" } },
    update: {},
    create: {
      type: "QUINCENAL",
      year: 2026,
      month: 7,
      numero: 2,
      startDate: "2026-07-16",
      endDate: "2026-07-31",
      payDate: "2026-07-31",
      status: "BORRADOR",
      parameterSetId,
    },
  });

  const AJUSTES: Record<string, { horas?: number; adelanto?: number; pagado?: boolean }> = {
    e1: { horas: 4 },
    e3: { horas: 6 },
    e5: { adelanto: 50000 },
    e4: { pagado: true },
    e6: { pagado: true },
  };

  for (const e of DEMO_EMPLOYEES) {
    const adj = AJUSTES[e.key] ?? {};
    await prisma.payrollItem.upsert({
      where: { periodId_employeeId: { periodId: period.id, employeeId: empIds.get(e.key)! } },
      update: {},
      create: {
        periodId: period.id,
        employeeId: empIds.get(e.key)!,
        contractId: contractIds.get(e.key)!,
        horasExtra: adj.horas ?? 0,
        adelanto: adj.adelanto ? cents(adj.adelanto) : 0n,
        paymentStatus: adj.pagado ? "PAGADO" : "PENDIENTE",
        paidAt: adj.pagado ? "2026-07-30" : null,
        paymentMethod: adj.pagado ? "Transferencia" : null,
      },
    });
  }
  console.log("✓ período Quincena 2 · 16–31 jul 2026 (BORRADOR) con 8 líneas");

  // Demo EMPLEADO user → Esteban Zúñiga (e1)
  const empleadoEmail = "empleado@example.com";
  const passwordHash = await bcrypt.hash(process.env.SEED_EMPLOYEE_PASSWORD ?? "cambiame-ya", 10);
  await prisma.user.upsert({
    where: { email: empleadoEmail },
    update: { employeeId: empIds.get("e1") },
    create: {
      email: empleadoEmail,
      passwordHash,
      name: "Esteban Zúñiga Brenes",
      role: "EMPLEADO",
      employeeId: empIds.get("e1"),
    },
  });
  console.log("✓ usuario EMPLEADO demo (empleado@example.com → Esteban Zúñiga)");
}

async function main() {
  const { ownerId, assistantId } = await seedUsers();
  await seedPermissions();
  const paramSet = await seedParameterSet();
  await seedHolidays();

  if (process.env.SEED_DEMO_DATA === "true") {
    await seedDemoData(ownerId, assistantId, paramSet.id);
  } else {
    console.log("· datos demo omitidos (SEED_DEMO_DATA ≠ true)");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
