import { z } from "zod";

export const clientFormSchema = z.object({
  kind: z.enum(["FISICA", "JURIDICA"]),
  nombre: z.string().trim(),
  cedula: z.string().trim(),
  contacto: z.string().trim(),
  telefono: z.string().trim(),
  email: z.string().trim(),
  notas: z.string().trim(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export interface ClientFormErrors {
  fields: ("nombre" | "cedula")[];
  message: string;
}

/** Mirrors the employee modal's prose validation style. */
export function validateClientForm(values: ClientFormValues): ClientFormErrors | null {
  const fields: ClientFormErrors["fields"] = [];
  const parts: string[] = [];
  if (values.nombre === "") {
    fields.push("nombre");
    parts.push("el nombre o razón social");
  }
  if (values.cedula === "") {
    fields.push("cedula");
    parts.push("la cédula");
  }
  if (fields.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  return { fields, message: `Hace falta ${list} para poder registrar al cliente.` };
}
