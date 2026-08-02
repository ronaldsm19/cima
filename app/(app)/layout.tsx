import { requireUser, hasPermission } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/shell/Header";
import { PeriodSelector } from "@/components/shell/PeriodSelector";
import { Sidebar } from "@/components/shell/Sidebar";
import { NAV_GROUPS } from "@/components/shell/nav";
import { todayCR } from "@/lib/format/dates";
import { listPeriodOptions } from "@/lib/planilla/data";
import { currentPeriodKey } from "@/lib/planilla/periods";

const ROLE_LABELS = {
  SUPER_ADMIN: "Dueño · acceso total",
  ADMIN: "Asistente administrativa",
  EMPLEADO: "Empleado",
} as const;

/** Sidebar badge counts — resilient: any DB hiccup just hides the badges. */
async function getBadgeCounts(): Promise<Record<string, number | null>> {
  try {
    const today = todayCR();
    const [empleados, clientes, vencidos, pendientes] = await Promise.all([
      prisma.employee.count({ where: { ...notDeleted, status: "ACTIVO" } }),
      prisma.client.count({ where: { ...notDeleted } }),
      prisma.project.count({
        where: {
          ...notDeleted,
          status: { notIn: ["ENTREGADO", "CANCELADO"] },
          dueDate: { lt: today },
        },
      }),
      prisma.payrollItem.count({
        where: {
          paymentStatus: "PENDIENTE",
          period: { is: { ...currentPeriodKey(), type: "QUINCENAL" } },
        },
      }),
    ]);
    return {
      empleados,
      clientes,
      proyectosVencidos: vencidos,
      planillaPendientes: pendientes,
    };
  } catch {
    return {};
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const allItems = NAV_GROUPS.flatMap((g) => g.items);
  const allowed = await Promise.all(
    allItems.map(async (item) => ((await hasPermission(user.role, item.permission)) ? item.href : null)),
  );
  const allowedHrefs = allowed.filter((h): h is string => h !== null);
  const badges = await getBadgeCounts();
  const showPeriodSelector = user.role !== "EMPLEADO";
  const periodOptions = showPeriodSelector ? await listPeriodOptions().catch(() => []) : [];

  return (
    <div className="flex min-h-screen max-[960px]:flex-col">
      <Sidebar
        allowedHrefs={allowedHrefs}
        badges={badges}
        userName={user.name}
        userRoleLabel={ROLE_LABELS[user.role]}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          periodSlot={
            periodOptions.length > 0 ? <PeriodSelector options={periodOptions} /> : undefined
          }
        />
        <main className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6 pt-5">
          {children}
        </main>
      </div>
    </div>
  );
}
