import type { EmployeeFormValues } from "./form";
import type { PlainEngineParams } from "@/lib/payroll/params";

/** Serializable payload for the employee record screen. */
export interface FichaEmpleadoDTO {
  id: string;
  nombre: string;
  puesto: string;
  cedula: string;
  telefono: string | null;
  iban: string | null;
  estado: "ACTIVO" | "INCAPACITADO" | "LIQUIDADO";
  hireDate: string;
  antiguedad: string; // "9 años 2 meses"
  modalidad: "SEMANAL" | "QUINCENAL" | "MENSUAL";
  salarioBase: string; // colones (unit of modalidad)
  mensualEquivalente: string;
  solidaristaPct: number | null;
  embargo: string | null; // colones per period
  vacaciones: { acumulado: number; tomados: number; saldo: number };
  deducciones: {
    ccssPct: string; // "10,67 %"
    rentaPeriodo: string | null;
    adelantoVigente: string | null;
  };
  historial: {
    itemId: string;
    periodId: string;
    periodo: string;
    pagadoEl: string | null;
    bruto: string;
    deducciones: string;
    neto: string;
  }[];
  vacacionesTomadas: { rango: string; nota: string | null; dias: number }[];
  form: EmployeeFormValues & { employeeId: string };
  permisos: { crud: boolean };
  params: PlainEngineParams;
}
