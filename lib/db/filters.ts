/**
 * Soft-delete filter for the MongoDB connector.
 *
 * In MongoDB, Prisma distinguishes `null` from a MISSING field: filtering
 * `{ deletedAt: null }` does NOT match documents where the field was never set
 * (verified empirically against Atlas — it returned 0 of 8 employees).
 * Every "not deleted" query must use this filter instead.
 *
 * Usage: `where: { ...notDeleted, status: "ACTIVO" }`.
 * If your where clause needs its own OR, nest this under AND:
 * `where: { AND: [notDeleted], OR: [...] }`.
 */
export const notDeleted = {
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
} as const;
