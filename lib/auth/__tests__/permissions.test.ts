import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_MATRIX,
  resolvePermission,
  type PermissionOverride,
} from "../permissions";

describe("resolvePermission", () => {
  it("SUPER_ADMIN has every permission and ignores overrides", () => {
    const hostile: PermissionOverride[] = ALL_PERMISSION_KEYS.map((k) => ({
      role: "SUPER_ADMIN",
      permissionKey: k,
      allowed: false,
    }));
    for (const key of ALL_PERMISSION_KEYS) {
      expect(resolvePermission("SUPER_ADMIN", key, hostile)).toBe(true);
    }
  });

  it("ADMIN defaults: everything operational, no user/permission/audit management", () => {
    expect(resolvePermission("ADMIN", "planilla.aprobar", [])).toBe(true);
    expect(resolvePermission("ADMIN", "pagos.marcar", [])).toBe(true);
    expect(resolvePermission("ADMIN", "usuarios.gestionar", [])).toBe(false);
    expect(resolvePermission("ADMIN", "permisos.gestionar", [])).toBe(false);
    expect(resolvePermission("ADMIN", "auditoria.ver", [])).toBe(false);
  });

  it("EMPLEADO defaults: only their own portal", () => {
    expect(resolvePermission("EMPLEADO", "portal.propio", [])).toBe(true);
    for (const key of ALL_PERMISSION_KEYS.filter((k) => k !== "portal.propio")) {
      expect(resolvePermission("EMPLEADO", key, [])).toBe(false);
    }
  });

  it("a DB override flips the behavior in both directions", () => {
    const overrides: PermissionOverride[] = [
      { role: "ADMIN", permissionKey: "planilla.aprobar", allowed: false },
      { role: "EMPLEADO", permissionKey: "vacaciones.registrar", allowed: true },
    ];
    expect(resolvePermission("ADMIN", "planilla.aprobar", overrides)).toBe(false);
    expect(resolvePermission("EMPLEADO", "vacaciones.registrar", overrides)).toBe(true);
    // untouched keys keep their defaults
    expect(resolvePermission("ADMIN", "pagos.marcar", overrides)).toBe(true);
  });

  it("overrides for one role never leak into another", () => {
    const overrides: PermissionOverride[] = [
      { role: "EMPLEADO", permissionKey: "planilla.aprobar", allowed: true },
    ];
    expect(resolvePermission("ADMIN", "planilla.aprobar", overrides)).toBe(true);
    expect(resolvePermission("EMPLEADO", "planilla.aprobar", overrides)).toBe(true);
    expect(resolvePermission("EMPLEADO", "planilla.ver", overrides)).toBe(false);
  });

  it("the default matrix covers every registered key for every role", () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(typeof DEFAULT_MATRIX.ADMIN[key]).toBe("boolean");
      expect(typeof DEFAULT_MATRIX.EMPLEADO[key]).toBe("boolean");
    }
  });
});
