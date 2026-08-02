import { z } from "zod";

/**
 * Shared shape for the alta/edición modal. Client validates for the literal
 * "Faltan datos" prose; the server re-validates with the same schema.
 */
export const employeeFormSchema = z.object({
  nombre: z.string().trim(),
  cedula: z.string().trim(),
  puesto: z.string().trim(),
  modalidad: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
  /** Colones in the unit of the modalidad, as decimal string ("" = missing). */
  salarioBase: z.string().trim(),
  ingreso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  iban: z.string().trim(),
  telefono: z.string().trim().optional(),
  /** Percent, "" = none. */
  solidarista: z.string().trim(),
  /** Colones per period, "" = none. */
  embargo: z.string().trim(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export interface EmployeeFormErrors {
  fields: ("nombre" | "cedula" | "salarioBase")[];
  message: string;
}

const parseMoney = (raw: string): number => {
  const n = Number(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * README validation: nombre with at least two words, cédula non-empty,
 * salario base > 0. Returns the literal prose message
 * ("Hace falta el nombre completo, la cédula y el salario base para poder
 * calcular la planilla.") built from whichever fields are missing.
 */
export function validateEmployeeForm(values: EmployeeFormValues): EmployeeFormErrors | null {
  const fields: EmployeeFormErrors["fields"] = [];
  const parts: string[] = [];

  if (values.nombre.split(/\s+/).filter(Boolean).length < 2) {
    fields.push("nombre");
    parts.push("el nombre completo");
  }
  if (values.cedula === "") {
    fields.push("cedula");
    parts.push("la cédula");
  }
  const salario = parseMoney(values.salarioBase);
  if (!(salario > 0)) {
    fields.push("salarioBase");
    parts.push("el salario base");
  }

  if (fields.length === 0) return null;

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
  return { fields, message: `Hace falta ${list} para poder calcular la planilla.` };
}

export const SALARY_UNIT_SUFFIX = {
  SEMANAL: "₡ por semana",
  QUINCENAL: "₡ por quincena",
  MENSUAL: "₡ por mes",
} as const;
