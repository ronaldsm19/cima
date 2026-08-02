import {
  BarChart3,
  CalendarDays,
  Coins,
  Download,
  FileSpreadsheet,
  Folder,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { requirePermission } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";
import { todayCR } from "@/lib/format/dates";
import { periodLabel } from "@/lib/planilla/periods";
import { ReportCard } from "@/components/reportes/ReportCard";

export default async function ReportesPage() {
  await requirePermission("reportes.generar");
  const year = Number(todayCR().slice(0, 4));

  const [periodos, empleados] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { status: { not: "BORRADOR" } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { numero: "desc" }],
      take: 12,
    }),
    prisma.employee.findMany({
      where: { ...notDeleted },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  const periodOptions = periodos.map((p) => ({ value: p.id, label: periodLabel(p) }));
  const employeeOptions = empleados.map((e) => ({ value: e.id, label: e.fullName }));
  const yearOptions = [year, year - 1, year - 2].map((y) => ({ value: String(y), label: String(y) }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <p className="text-[12.5px] text-ink-mid">
        Cada reporte se descarga en Excel con el encabezado de la oficina, formato de colones y
        fila de totales. La hoja &quot;Parámetros&quot; deja registrado con qué filtros se generó.
      </p>

      <div className="grid grid-cols-2 gap-3.5 max-[960px]:grid-cols-1">
        <ReportCard
          icon={Wallet}
          title="Planilla por período"
          detail="Detalle de bruto, cada deducción y neto por empleado, con el estado de pago."
          tipo="planilla-periodo"
          filters={[{ name: "periodo", label: "Período", options: periodOptions }]}
        />
        <ReportCard
          icon={Users}
          title="Pagos a un empleado"
          detail="Todos los pagos de una persona en un rango de fechas."
          tipo="pagos-empleado"
          filters={[
            { name: "empleado", label: "Empleado", options: employeeOptions },
            { name: "desde", label: "Desde", type: "date" },
            { name: "hasta", label: "Hasta", type: "date" },
          ]}
        />
        <ReportCard
          icon={FileSpreadsheet}
          title="Resumen anual por empleado"
          detail="Bruto, deducciones y neto del año, con el aguinaldo calculado (dic–nov)."
          tipo="resumen-anual"
          filters={[{ name: "anio", label: "Año", options: yearOptions }]}
        />
        <ReportCard
          icon={TrendingUp}
          title="Cuentas por cobrar"
          detail="Saldo pendiente por cliente y proyecto, con los vencidos de primero."
          tipo="cuentas-por-cobrar"
        />
        <ReportCard
          icon={Coins}
          title="Ingresos por tipo de trabajo"
          detail="Abonos recibidos agrupados por tipo de trabajo en un rango."
          tipo="ingresos-por-tipo"
          filters={[
            { name: "desde", label: "Desde", type: "date" },
            { name: "hasta", label: "Hasta", type: "date" },
          ]}
        />
        <ReportCard
          icon={Folder}
          title="Proyectos abiertos"
          detail="Trabajos en curso con antigüedad en días, fecha de entrega y saldo."
          tipo="proyectos-abiertos"
        />
        <ReportCard
          icon={CalendarDays}
          title="Vacaciones"
          detail="Saldo acumulado, días disfrutados y alerta de acumulación por empleado."
          tipo="vacaciones"
        />
        <ReportCard
          icon={BarChart3}
          title="Rentabilidad por proyecto"
          detail="Monto acordado menos gastos y viáticos, con el margen de cada trabajo."
          tipo="rentabilidad"
          filters={[
            { name: "desde", label: "Desde", type: "date" },
            { name: "hasta", label: "Hasta", type: "date" },
          ]}
        />
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[12px] text-ink-mid shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <Download size={14} strokeWidth={1.8} className="mt-0.5 flex-none text-ink-dim" aria-hidden />
        <span>
          Los montos salen de la foto congelada de cada planilla aprobada, así que un reporte
          viejo siempre da los mismos números aunque después cambien salarios o tasas.
        </span>
      </div>
    </div>
  );
}
