import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/proyectos/ProjectForm";
import { requirePermission } from "@/lib/auth/access";
import { getProyectoDTO } from "@/lib/proyectos/data";

export default async function ProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("proyectos.ver");
  const { id } = await params;

  const dto = await getProyectoDTO(id, user.role);
  if (!dto) notFound();

  return <ProjectForm mode={{ kind: "edit", dto }} />;
}
