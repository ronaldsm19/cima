import { notFound } from "next/navigation";
import { ClientChips } from "@/components/clientes/ClientChips";
import { FichaCliente } from "@/components/clientes/FichaCliente";
import { requirePermission } from "@/lib/auth/access";
import { getFichaCliente, listClientChips } from "@/lib/clientes/data";

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("clientes.ver");
  const { id } = await params;

  const [clients, ficha] = await Promise.all([
    listClientChips(),
    getFichaCliente(id, user.role),
  ]);
  if (!ficha) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <ClientChips clients={clients} activeId={ficha.id} canCrud={ficha.permisos.crud} />
      <FichaCliente ficha={ficha} />
    </div>
  );
}
