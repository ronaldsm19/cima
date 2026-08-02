"use server";

import { revalidatePath } from "next/cache";
import { requirePermissionAction } from "@/lib/auth/access";
import { notDeleted } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";
import {
  clientFormSchema,
  validateClientForm,
  type ClientFormValues,
} from "@/lib/clientes/form";

export type ClientActionResult =
  | { ok: true; clientId: string }
  | { ok: false; error: string; fields?: string[] };

function failClient(error: unknown): ClientActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo salió mal. Intentá de nuevo.",
  };
}

export async function createClient(raw: ClientFormValues): Promise<ClientActionResult> {
  try {
    const user = await requirePermissionAction("clientes.crud");
    const values = clientFormSchema.parse(raw);
    const invalid = validateClientForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const dup = await prisma.client.findFirst({
      where: { ...notDeleted, cedula: values.cedula },
    });
    if (dup) {
      return {
        ok: false,
        error: `Ya existe un cliente con la cédula ${values.cedula} (${dup.name}).`,
        fields: ["cedula"],
      };
    }

    const client = await prisma.client.create({
      data: {
        kind: values.kind,
        name: values.nombre,
        cedula: values.cedula,
        contactName: values.contacto || null,
        phone: values.telefono || null,
        email: values.email || null,
        notes: values.notas || null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "CREATE",
        entity: "Client",
        entityId: client.id,
        after: { nombre: values.nombre, cedula: values.cedula },
        summary: `Cliente creado · ${values.nombre}`,
      },
    });

    revalidatePath("/clientes");
    return { ok: true, clientId: client.id };
  } catch (e) {
    return failClient(e);
  }
}

export async function updateClient(
  clientId: string,
  raw: ClientFormValues,
): Promise<ClientActionResult> {
  try {
    const user = await requirePermissionAction("clientes.crud");
    const values = clientFormSchema.parse(raw);
    const invalid = validateClientForm(values);
    if (invalid) return { ok: false, error: invalid.message, fields: invalid.fields };

    const before = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
    await prisma.client.update({
      where: { id: clientId },
      data: {
        kind: values.kind,
        name: values.nombre,
        cedula: values.cedula,
        contactName: values.contacto || null,
        phone: values.telefono || null,
        email: values.email || null,
        notes: values.notas || null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "UPDATE",
        entity: "Client",
        entityId: clientId,
        before: { nombre: before.name, cedula: before.cedula },
        after: { nombre: values.nombre, cedula: values.cedula },
        summary: `Cliente actualizado · ${values.nombre}`,
      },
    });

    revalidatePath("/clientes");
    return { ok: true, clientId };
  } catch (e) {
    return failClient(e);
  }
}

/** Soft delete — blocked while the client still has open projects with balance. */
export async function deactivateClient(clientId: string): Promise<ClientActionResult> {
  try {
    const user = await requirePermissionAction("clientes.crud");
    const client = await prisma.client.findUniqueOrThrow({
      where: { id: clientId },
      include: { projects: { include: { payments: true } } },
    });

    const abiertos = client.projects.filter(
      (p) => p.deletedAt === null && !["ENTREGADO", "CANCELADO"].includes(p.status),
    );
    if (abiertos.length > 0) {
      return {
        ok: false,
        error: `${client.name} tiene ${abiertos.length} proyecto${abiertos.length !== 1 ? "s" : ""} abierto${abiertos.length !== 1 ? "s" : ""}. Cerralos o cancelalos antes de darlo de baja.`,
      };
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "DELETE",
        entity: "Client",
        entityId: clientId,
        summary: `Cliente dado de baja · ${client.name}`,
      },
    });

    revalidatePath("/clientes");
    const next = await prisma.client.findFirst({ where: { ...notDeleted }, orderBy: { name: "asc" } });
    return { ok: true, clientId: next?.id ?? "" };
  } catch (e) {
    return failClient(e);
  }
}
