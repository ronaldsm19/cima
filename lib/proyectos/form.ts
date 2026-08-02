import { z } from "zod";

export const PROJECT_TYPE_OPTIONS = [
  { value: "LEVANTAMIENTO", label: "Levantamiento topográfico" },
  { value: "SEGREGACION", label: "Segregación" },
  { value: "CATASTRO", label: "Catastro" },
  { value: "VISADO_MUNICIPAL", label: "Visado municipal" },
  { value: "REPLANTEO", label: "Replanteo" },
  { value: "PLANO_CATASTRADO", label: "Plano catastrado" },
  { value: "DESLINDE", label: "Deslinde" },
  { value: "AMOJONAMIENTO", label: "Amojonamiento" },
  { value: "CURVAS_NIVEL", label: "Curvas de nivel" },
  { value: "OTRO", label: "Otro" },
] as const;

export const projectFormSchema = z.object({
  clientId: z.string().min(1),
  tipo: z.enum([
    "LEVANTAMIENTO",
    "PLANO_CATASTRADO",
    "REPLANTEO",
    "DESLINDE",
    "AMOJONAMIENTO",
    "CURVAS_NIVEL",
    "VISADO_MUNICIPAL",
    "SEGREGACION",
    "CATASTRO",
    "OTRO",
  ]),
  descripcion: z.string().trim(),
  finca: z.string().trim(),
  plano: z.string().trim(),
  entrega: z.string().trim(), // yyyy-MM-dd o ""
  monto: z.string().trim(), // colones
  primaPct: z.string().trim(), // %
  estado: z.enum(["COTIZADO", "ABIERTO", "EN_PROCESO", "EN_VISADO", "ENTREGADO", "CANCELADO"]),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export interface ProjectFormErrors {
  fields: ("clientId" | "monto" | "primaPct" | "entrega")[];
  message: string;
}

export function validateProjectForm(values: ProjectFormValues): ProjectFormErrors | null {
  const fields: ProjectFormErrors["fields"] = [];
  const parts: string[] = [];
  if (values.clientId === "") {
    fields.push("clientId");
    parts.push("el cliente");
  }
  const monto = Number(values.monto.replace(/\./g, "").replace(",", "."));
  if (!(monto > 0)) {
    fields.push("monto");
    parts.push("el monto acordado");
  }
  const prima = Number(values.primaPct.replace(",", "."));
  if (!(prima >= 0 && prima <= 100)) {
    fields.push("primaPct");
    parts.push("una prima entre 0 y 100 %");
  }
  if (values.entrega !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(values.entrega)) {
    fields.push("entrega");
    parts.push("una fecha de entrega válida");
  }
  if (fields.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  return { fields, message: `Hace falta ${list} para poder guardar el proyecto.` };
}
