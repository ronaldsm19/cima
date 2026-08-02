import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/proyectos/ProjectForm";
import { requirePermission } from "@/lib/auth/access";
import { getNuevoProyectoDTO } from "@/lib/proyectos/data";

export default async function NuevoProyectoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const user = await requirePermission("proyectos.crud");
  const { cliente } = await searchParams;

  const dto = await getNuevoProyectoDTO(user.role, cliente);
  if (dto.clientes.length === 0) redirect("/clientes");

  return (
    <ProjectForm
      mode={{ kind: "create", form: dto.form, clientes: dto.clientes, permisos: dto.permisos }}
    />
  );
}
