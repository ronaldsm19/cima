/**
 * MongoDB null-vs-unset helpers.
 *
 * Prisma on MongoDB distinguishes `null` from a MISSING field: filtering
 * `{ deletedAt: null }` does NOT match documents where the field was never
 * written (verified against Atlas — it returned 0 of 8 employees). Any query
 * that means "this optional field has no value" must cover both cases.
 *
 * Note the inverse works fine: `{ campo: { not: null } }` already excludes
 * unset fields, so snapshot filters like `{ neto: { not: null } }` are correct
 * as written.
 */

/** `where: { ...nullOrUnset("readAt") }` → matches null AND missing. */
export function nullOrUnset(field: string) {
  return { OR: [{ [field]: null }, { [field]: { isSet: false } }] };
}

/** Soft-delete filter: `where: { ...notDeleted, status: "ACTIVO" }`.
 *  If the surrounding clause needs its own OR, nest this under AND. */
export const notDeleted = nullOrUnset("deletedAt");
