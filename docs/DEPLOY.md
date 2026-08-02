# Despliegue en Vercel

## 1. Antes de desplegar (una sola vez)

**Atlas — permitir el acceso desde Vercel.** Las funciones de Vercel salen desde IPs
que cambian, así que Atlas tiene que aceptarlas:

1. Atlas → tu proyecto → **Network Access** → **Add IP Address**
2. **Allow access from anywhere** (`0.0.0.0/0`) → Confirm

Sin esto el sitio despliega bien pero toda consulta falla con *timeout*.

**Cambiá las contraseñas del seed.** Las de desarrollo (`cambiame-ya`) no sirven para
una URL pública:

```bash
npm run user:password -- dueno@example.com "una-contraseña-larga-de-verdad"
```

## 2. Crear el proyecto en Vercel

1. Entrá a <https://vercel.com/new> con la cuenta de GitHub que tiene el repo.
2. **Import** en `ronaldsm19/cima`.
3. Framework: Next.js (lo detecta solo). No cambiés Build Command ni Output Directory.
4. Abrí **Environment Variables** y pegá el bloque de la sección 3 (el campo acepta
   varias líneas `CLAVE=valor` de un solo pegue).
5. **Deploy**.

El primer despliegue tarda ~2 minutos. El build corre `prisma generate && next build`.

## 3. Variables de entorno

Marcalas para **Production, Preview y Development**. Los valores reales están en el
`.env` local — este archivo documenta solo cuáles se ocupan.

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión de Atlas, con el nombre de la base al final (`/cima`) | Sí |
| `AUTH_SECRET` | Firma de las sesiones de Auth.js. Usá una **distinta** de la local | Sí |
| `EMAIL_ENABLED` | `true` para habilitar el correo saliente | Fase 8 |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` | Servidor de salida (Gmail: `smtp.gmail.com`, `587`, `false`) | Fase 8 |
| `SMTP_USER` · `SMTP_PASS` | Cuenta y contraseña de aplicación | Fase 8 |
| `SMTP_FROM` | Remitente que ve quien recibe | Fase 8 |

**No pongas las `SEED_*` en Vercel.** El seed se corre desde tu máquina contra la misma
base; en el servidor solo estorban y son credenciales de más.

`AUTH_URL` / `AUTH_TRUST_HOST` tampoco hacen falta: Auth.js confía en el host
automáticamente cuando detecta que corre en Vercel.

## 4. Después del primer despliegue

- Entrá a `https://<tu-proyecto>.vercel.app/login` y probá con el usuario dueño.
- Si algo falla, Vercel → tu proyecto → **Logs** (runtime) o **Deployments → Building**.

### Datos de demostración

La base `cima` hoy tiene los datos ficticios del prototipo (8 empleados, 4 clientes,
6 proyectos). Antes de usar el sistema con datos reales, elegí una de las dos:

- **Base aparte para producción**: cambiá el nombre de la base en `DATABASE_URL`
  (`/cima_prod`), corré `npm run db:push` y `npm run db:seed` con `SEED_DEMO_DATA=false`.
- **Limpiar la actual**: borrá las colecciones de demo desde Atlas y volvé a sembrar
  con `SEED_DEMO_DATA=false`.

### Cambios de esquema

Mongo no usa migraciones: después de tocar `prisma/schema.prisma`, corré desde tu
máquina `npm run db:push` apuntando a la base de producción. El despliegue en sí no
modifica el esquema.

## 5. Respaldo

```bash
mongodump --uri="<DATABASE_URL>" --out=./backup-$(date +%Y-%m-%d)
```
