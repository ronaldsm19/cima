import { FeriadosTable } from "@/components/feriados/FeriadosTable";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { prisma } from "@/lib/db/prisma";
import { todayCR } from "@/lib/format/dates";

export default async function FeriadosPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requirePermission("vacaciones.ver");
  const { year: yearParam } = await searchParams;
  const currentYear = Number(todayCR().slice(0, 4));
  const year = /^\d{4}$/.test(yearParam ?? "") ? Number(yearParam) : currentYear;

  const [feriados, distinctYears, canCrud] = await Promise.all([
    prisma.holiday.findMany({ where: { year }, orderBy: { date: "asc" } }),
    prisma.holiday.findMany({ distinct: ["year"], select: { year: true }, orderBy: { year: "asc" } }),
    hasPermission(user.role, "feriados.crud"),
  ]);

  const years = [...new Set([...distinctYears.map((d) => d.year), currentYear, year, year + 1])].sort();

  return (
    <FeriadosTable
      feriados={feriados.map((f) => ({
        id: f.id,
        date: f.date,
        name: f.name,
        pagoObligatorio: f.pagoObligatorio,
        esTrasladable: f.esTrasladable,
        recurrenteAnual: f.recurrenteAnual,
      }))}
      year={year}
      years={years}
      canCrud={canCrud}
    />
  );
}
