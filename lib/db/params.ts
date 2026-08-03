import { cache } from "react";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import type { PlainEngineParams } from "@/lib/payroll/params";

/**
 * Loads the legal parameter set in force for a given business date
 * (vigenteDesde ≤ date ≤ vigenteHasta). Falls back to the most recent set —
 * a period must never be created without parameters.
 */
export const getParameterSetFor = cache(async (dateIso: string) => {
  const inForce = await prisma.payrollParameterSet.findFirst({
    where: {
      vigenteDesde: { lte: dateIso },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: dateIso } }],
    },
    orderBy: { vigenteDesde: "desc" },
    include: { isrBrackets: { orderBy: { orden: "asc" } } },
  });
  if (inForce) return inForce;

  const latest = await prisma.payrollParameterSet.findFirst({
    orderBy: { vigenteDesde: "desc" },
    include: { isrBrackets: { orderBy: { orden: "asc" } } },
  });
  if (!latest) {
    throw new Error(
      "No hay parámetros de planilla configurados. Registrá un período fiscal en Configuración.",
    );
  }
  return latest;
});

export const getParameterSetById = cache(async (id: string) => {
  const set = await prisma.payrollParameterSet.findUnique({
    where: { id },
    include: { isrBrackets: { orderBy: { orden: "asc" } } },
  });
  if (!set) throw new Error("El período apunta a parámetros que ya no existen.");
  return set;
});

type ParameterSetRow = Awaited<ReturnType<typeof getParameterSetById>>;

/** DB row → serializable engine params (safe across the RSC/client boundary). */
export function toPlainParams(set: ParameterSetRow): PlainEngineParams {
  return {
    tasaSem: set.tasaSem,
    tasaIvm: set.tasaIvm,
    tasaBp: set.tasaBp,
    tasaPatronal: set.tasaPatronal,
    horaExtraFactor: set.horaExtraFactor,
    horasMensuales: set.horasMensuales,
    factorSemanalAMensual: set.factorSemanalAMensual,
    isrBrackets: set.isrBrackets.map((b) => ({
      limiteInferior: centsToString(b.limiteInferior),
      limiteSuperior: b.limiteSuperior != null ? centsToString(b.limiteSuperior) : null,
      tasaPct: b.tasaPct,
    })),
    creditoFiscalHijoMensual: centsToString(set.creditoFiscalHijoMensual),
    creditoFiscalConyugeMensual: centsToString(set.creditoFiscalConyugeMensual),
  };
}
