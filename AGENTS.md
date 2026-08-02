<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sistema interno — Oficina de topografía (CIMA)

Internal web app for a Costa Rican land-surveying office: payroll (planilla),
employees, vacations, clients and projects. Two admin users + employee portal.

## Sources of truth

- `docs/design/README.md` — the v2 design spec (exact measures, colors, literal
  es-CR UI texts). **The `docs/design/tokens/` folder is the old v1 language —
  never use it**; v2 tokens live in `app/globals.css` (from the README table).
- Approved plan: 10 phases; each ends with user sign-off.

## Hard conventions

- **Money**: MongoDB via Prisma has no Decimal → every amount is INTEGER CENTS
  in a `BigInt` field. Convert only through `lib/db/money.ts`. Math uses
  decimal.js. Never `Number()` on money, never float arithmetic, never
  serialize BigInt/Decimal to client components — send decimal strings.
- **Currency display**: only `formatCRC` / `formatCRC0` from
  `lib/format/currency.ts` (`₡1.234.567,89`). `toLocaleString` is forbidden on
  money (es-CR returns spaces as thousands separator).
- **Business dates**: ISO `yyyy-MM-dd` strings end-to-end (`lib/format/dates.ts`),
  display as `dd/MM/yyyy`. "Today" = `todayCR()` (America/Costa_Rica). Never
  `new Date(y, m, d)` for calendar math.
- **Payroll engine** (`lib/payroll/`): pure, no Prisma imports, fully unit
  tested (`npm test`). Rounding contract: round each concept to 2 places, derive
  neto/totals from rounded concepts — desglose must always sum exactly.
- **Authorization**: every page calls `requirePermission`, every Server Action
  calls `requirePermissionAction` (`lib/auth/access.ts`). Permission keys live
  in `lib/auth/permissions.ts`; the effective matrix is DB-backed
  (`RolePermission`) and editable by SUPER_ADMIN. Hiding buttons is never the
  security boundary.
- **Approved payroll periods are frozen**: snapshot columns + pinned
  `parameterSetId`; server actions must reject mutations unless
  `status === "BORRADOR"`.
- **Numbers in UI**: IBM Plex Mono + `tabular-nums` (`.num` / `.num-right`
  utilities) on all montos, cédulas, códigos, fincas, table dates, calendar days.
- **Language**: code/comments/commits in English; ALL UI text in Costa Rican
  Spanish with voseo ("Registrá", "Agregá"). Use the literal error/empty-state
  texts from `docs/design/README.md`.
- Soft delete (`deletedAt`) on Employee/Client/Project; money mutations write
  `AuditLog`.

## Commands

- `npm test` — Vitest (engine, formatter, permissions golden tests)
- `npm run db:push` / `npm run db:seed` — Prisma → MongoDB (needs `DATABASE_URL`
  in `.env`; Atlas replica set required for transactions)
- `npm run dev` / `npm run build`
