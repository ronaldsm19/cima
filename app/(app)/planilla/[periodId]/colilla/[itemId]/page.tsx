import { notFound } from "next/navigation";
import { ColillaPrint } from "@/components/planilla/ColillaPrint";
import { requirePermission } from "@/lib/auth/access";
import { centsToString } from "@/lib/db/money";
import { prisma } from "@/lib/db/prisma";
import { periodLabel } from "@/lib/planilla/periods";

/**
 * Printable payslip. Renders exclusively from the frozen snapshot: a colilla
 * handed to an employee must never change afterwards.
 */
export default async function ColillaPage({
  params,
}: {
  params: Promise<{ periodId: string; itemId: string }>;
}) {
  const user = await requirePermission("colillas.generar");
  const { periodId, itemId } = await params;

  const item = await prisma.payrollItem.findUnique({
    where: { id: itemId },
    include: { employee: true, period: true },
  });
  if (!item || item.periodId !== periodId || item.neto == null) notFound();

  // EMPLEADO users may only open their own payslip
  if (user.role === "EMPLEADO" && user.employeeId !== item.employeeId) notFound();

  return (
    <ColillaPrint
      data={{
        periodo: periodLabel(item.period),
        payDate: item.period.payDate,
        empleado: item.employee.fullName,
        cedula: item.employee.cedula,
        puesto: item.employee.position,
        iban: item.employee.iban,
        modalidad: item.salaryUnitSnap ?? "QUINCENAL",
        basePeriodo: centsToString(item.basePeriodo!),
        montoExtra: centsToString(item.montoExtra!),
        horasExtra: item.horasExtra,
        bruto: centsToString(item.bruto!),
        ccssSem: centsToString(item.ccssSem!),
        ccssIvm: centsToString(item.ccssIvm!),
        ccssBp: centsToString(item.ccssBp!),
        ccssTotal: centsToString(item.ccssTotal!),
        renta: centsToString(item.renta!),
        solidarista: centsToString(item.solidarista!),
        embargo: centsToString(item.embargo!),
        otras: centsToString(item.otrasDeducciones!),
        adelanto: centsToString(item.adelanto),
        totalDeducciones: centsToString(item.totalDeducciones! + item.adelanto),
        neto: centsToString(item.neto!),
        pagado: item.paymentStatus === "PAGADO",
        paidAt: item.paidAt,
      }}
    />
  );
}
