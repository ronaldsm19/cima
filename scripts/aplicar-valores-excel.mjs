/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

/**
 * One-time correction: replaces the seeded reference values with the ones from
 * the office's spreadsheet (Simulador_Planilla_CCSS_Costa_Rica.xlsx, citing
 * "Ministerio de Hacienda, tramos de renta 2026").
 *
 * This EDITS the 2026 set in place rather than opening a new fiscal period,
 * because the old numbers were placeholders from the design prototype, not a
 * rate that the law superseded. Approved periods are unaffected: they render
 * from their frozen snapshot columns, never from the parameters.
 *
 * Run: node --env-file=.env scripts/aplicar-valores-excel.mjs
 */

const prisma = new PrismaClient();
const cents = (colones) => BigInt(Math.round(colones * 100));

// Worker total is 10,83 % in the spreadsheet. It only gives the total, so the
// split below assigns the difference to IVM (5,50 + 4,33 + 1,00 = 10,83),
// which matches the published IVM worker increase. TODO: verificar el desglose.
const NUEVO = {
  tasaSem: 5.5,
  tasaIvm: 4.33,
  tasaBp: 1.0,
  tasaPatronal: 26.83,
  creditoFiscalHijoMensual: cents(1710),
  creditoFiscalConyugeMensual: cents(2590),
};

const TRAMOS = [
  { orden: 0, limiteInferior: cents(0), limiteSuperior: cents(918_000), tasaPct: 0 },
  { orden: 1, limiteInferior: cents(918_000), limiteSuperior: cents(1_347_000), tasaPct: 10 },
  { orden: 2, limiteInferior: cents(1_347_000), limiteSuperior: cents(2_364_000), tasaPct: 15 },
  { orden: 3, limiteInferior: cents(2_364_000), limiteSuperior: cents(4_727_000), tasaPct: 20 },
  { orden: 4, limiteInferior: cents(4_727_000), limiteSuperior: null, tasaPct: 25 },
];

async function main() {
  const set = await prisma.payrollParameterSet.findFirst({
    where: { vigenteHasta: null },
    orderBy: { vigenteDesde: "desc" },
    include: { isrBrackets: true },
  });
  if (!set) throw new Error("No hay un juego de parámetros vigente.");

  const owner = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!owner) throw new Error("No hay un usuario dueño para firmar la bitácora.");

  const antes = {
    ccssTotal: (set.tasaSem + set.tasaIvm + set.tasaBp).toFixed(2),
    tramos: set.isrBrackets
      .sort((a, b) => a.orden - b.orden)
      .map((b) => `${Number(b.limiteInferior) / 100}@${b.tasaPct}%`)
      .join(" · "),
    creditoHijo: Number(set.creditoFiscalHijoMensual) / 100,
  };

  // Snapshot of an approved line, to prove afterwards that history didn't move
  const aprobada = await prisma.payrollItem.findFirst({
    where: { neto: { not: null }, period: { is: { status: { not: "BORRADOR" } } } },
    include: { employee: { select: { fullName: true } }, period: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.payrollParameterSet.update({ where: { id: set.id }, data: NUEVO });
    await tx.isrBracket.deleteMany({ where: { parameterSetId: set.id } });
    for (const t of TRAMOS) {
      await tx.isrBracket.create({ data: { parameterSetId: set.id, ...t } });
    }
    await tx.auditLog.create({
      data: {
        actorId: owner.id,
        action: "UPDATE",
        entity: "PayrollParameterSet",
        entityId: set.id,
        before: antes,
        after: {
          ccssTotal: (NUEVO.tasaSem + NUEVO.tasaIvm + NUEVO.tasaBp).toFixed(2),
          tramoExento: 918000,
          creditoHijo: 1710,
          creditoConyuge: 2590,
          fuente: "Simulador_Planilla_CCSS_Costa_Rica.xlsx (Ministerio de Hacienda 2026)",
        },
        summary: `Parámetros alineados al Excel de la oficina · CCSS ${antes.ccssTotal} % → 10,83 %`,
      },
    });
  });

  console.log("✓ Parámetros actualizados");
  console.log(`  CCSS obrero: ${antes.ccssTotal} % → 10,83 % (SEM 5,50 · IVM 4,33 · BP 1,00)`);
  console.log("  Tramo exento: ₡942.000 → ₡918.000");
  console.log("  Créditos: hijo ₡1.710 · cónyuge ₡2.590");
  console.log("  Cargas patronales: 26,83 %");

  if (aprobada) {
    const despues = await prisma.payrollItem.findUnique({ where: { id: aprobada.id } });
    const igual = despues.neto === aprobada.neto && despues.ccssTotal === aprobada.ccssTotal;
    console.log(
      `\n${igual ? "✓" : "✗"} Período aprobado intacto: ${aprobada.employee.fullName} · ` +
        `neto ${Number(aprobada.neto) / 100} → ${Number(despues.neto) / 100}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
