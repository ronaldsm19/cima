# Sistema interno — Morales & Asoc. (topografía)

Aplicación web interna para una oficina de topografía en Costa Rica: planilla,
empleados, vacaciones, clientes y proyectos. Reemplaza el control en papel y Excel.

**Producción:** https://cima-rose.vercel.app

## Qué hace

| Pantalla | Para qué |
|---|---|
| **Panel** | Cuánto hay que pagar, a quién falta pagarle, cuánto deben los clientes |
| **Planilla** | Cálculo quincenal de las tres modalidades, edición en línea, aprobación que congela los montos, control de pagos |
| **Empleados** | Ficha con contrato (salario histórico), historial de pagos y saldo de vacaciones |
| **Vacaciones** | Calendario de rango con días hábiles excluyendo feriados, ajuste manual auditado |
| **Feriados** | CRUD por año, con duplicado al año siguiente |
| **Clientes / Proyectos** | Monto acordado, prima, abonos, saldo en vivo, gastos y rentabilidad |
| **Reportes** | Ocho exportaciones a Excel con formato de colones y totales |
| **Configuración** | Parámetros legales por período fiscal, usuarios y matriz de permisos |
| **Bitácora** | Quién cambió qué monto y cuándo |
| **Portal del empleado** | Sus colillas, su saldo de vacaciones y sus proyectos asignados |

## Antes de usarlo con datos reales

Leé **[docs/VALORES-A-VERIFICAR.md](docs/VALORES-A-VERIFICAR.md)**. Las tasas de CCSS,
los tramos de renta y las marcas de los feriados están sembrados con valores de
referencia sin confirmar. Se corrigen desde Configuración, sin desplegar.

## Arrancar en local

```bash
npm install
```

Copiá `.env.example` a `.env` y completá `DATABASE_URL` (MongoDB Atlas, con el nombre
de la base al final) y `AUTH_SECRET`. Después:

```bash
npm run db:push && npm run db:seed
```

```bash
npm run dev
```

El seed crea los usuarios administrativos, la matriz de permisos, los parámetros
2026 y los feriados. Con `SEED_DEMO_DATA=true` agrega además los datos ficticios del
prototipo (8 empleados, 4 clientes, 6 proyectos) para poder ver el sistema con
contenido.

Cambiá las contraseñas antes de exponer el sistema:

```bash
npm run user:password -- correo@dominio.cr "una-contraseña-larga"
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas del motor de cálculo, el formateador y los permisos |
| `npm run build` | Compilación de producción (incluye `prisma generate`) |
| `npm run db:push` | Aplica el esquema a MongoDB (no hay migraciones en Mongo) |
| `npm run db:seed` | Siembra datos base |
| `npm run backup` | Respalda la base con `mongodump` a `./backups/` |
| `npm run user:password` | Cambia la contraseña de un usuario |

## Cómo está hecho

Next.js 16 (App Router, Server Actions) · TypeScript estricto · MongoDB con Prisma ·
Auth.js v5 · Tailwind v4 + shadcn/ui re-tokenizado · ExcelJS · nodemailer.

Tres reglas que sostienen todo lo demás:

- **La plata nunca es un número flotante.** Se guarda en céntimos enteros y se
  calcula con decimal.js. Cada concepto se redondea a dos decimales y el neto se
  deriva de los conceptos ya redondeados, así el desglose siempre suma exacto.
- **El motor de cálculo es puro y está probado.** Vive en `lib/payroll/`, no toca la
  base de datos, y sus pruebas verifican los tres modos de pago, cada tramo de renta
  y los mensajes de error exactos.
- **Los permisos se validan en el servidor.** Cada pantalla y cada acción consultan
  la matriz configurable; esconder un botón nunca es la barrera.

El detalle de las convenciones está en [AGENTS.md](AGENTS.md); el despliegue, en
[docs/DEPLOY.md](docs/DEPLOY.md); el diseño original, en `docs/design/`.
