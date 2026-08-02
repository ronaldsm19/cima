import { redirect } from "next/navigation";
import { ClientChips } from "@/components/clientes/ClientChips";
import { hasPermission, requirePermission } from "@/lib/auth/access";
import { listClientChips } from "@/lib/clientes/data";

export default async function ClientesPage() {
  const user = await requirePermission("clientes.ver");
  const clients = await listClientChips();
  if (clients.length > 0) redirect(`/clientes/${clients[0].id}`);

  const canCrud = await hasPermission(user.role, "clientes.crud");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ClientChips clients={[]} activeId={null} canCrud={canCrud} />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface text-center shadow-[0_1px_2px_rgba(19,26,23,0.04)]">
        <div className="text-[14px] font-semibold text-ink">Todavía no hay clientes</div>
        <div className="text-[12.5px] text-ink-mid">
          Agregá el primero con el botón de arriba y después registrale sus proyectos.
        </div>
      </div>
    </div>
  );
}
