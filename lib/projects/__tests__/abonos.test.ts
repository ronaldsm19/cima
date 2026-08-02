import { Decimal } from "decimal.js";
import { describe, expect, it } from "vitest";
import { validateAbono } from "../abonos";

describe("validateAbono", () => {
  const saldo = new Decimal(1295000);

  it("accepts a payment within the pending balance", () => {
    expect(validateAbono(new Decimal(555000), saldo)).toBeNull();
  });

  it("accepts paying the exact balance (closes the project)", () => {
    expect(validateAbono(saldo, saldo)).toBeNull();
  });

  it("rejects zero and negative amounts", () => {
    expect(validateAbono(new Decimal(0), saldo)).toBe(
      "El abono tiene que ser mayor que cero. Revisá el monto.",
    );
    expect(validateAbono(new Decimal(-100), saldo)).not.toBeNull();
  });

  it("rejects overpayment with the exact README message", () => {
    expect(validateAbono(new Decimal(1500000), saldo)).toBe(
      "El abono de ₡1.500.000,00 supera el saldo pendiente de ₡1.295.000,00. Registrá ₡1.295.000,00 para cerrar el proyecto, o corregí el monto acordado.",
    );
  });
});
