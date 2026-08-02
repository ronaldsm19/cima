/* eslint-disable no-console */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Database backup: `npm run backup`
 *
 * Wraps mongodump so the office doesn't have to remember the connection
 * string. Writes to ./backups/<yyyy-MM-dd-HHmm>/ and fails loudly rather than
 * leaving a half-written folder that looks like a good backup.
 *
 * Requires MongoDB Database Tools (mongodump) on PATH:
 * https://www.mongodb.com/try/download/database-tools
 */

const uri = process.env.DATABASE_URL;
if (!uri) {
  console.error("Falta DATABASE_URL. Corré el script con: node --env-file=.env scripts/backup.mjs");
  process.exit(1);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

const outDir = path.resolve(process.cwd(), "backups", stamp);
if (!existsSync(path.dirname(outDir))) mkdirSync(path.dirname(outDir), { recursive: true });

console.log(`Respaldando la base en ${outDir} …`);
try {
  execFileSync("mongodump", [`--uri=${uri}`, `--out=${outDir}`], { stdio: "inherit" });
  console.log(`\n✓ Respaldo listo: ${outDir}`);
  console.log("  Guardalo fuera de la máquina (Drive, disco externo).");
  console.log(`  Para restaurar: mongorestore --uri="<DATABASE_URL>" --drop "${outDir}"`);
} catch (error) {
  console.error("\n✗ El respaldo falló.");
  if (error.code === "ENOENT") {
    console.error(
      "  No se encontró 'mongodump'. Instalá MongoDB Database Tools:\n" +
        "  https://www.mongodb.com/try/download/database-tools",
    );
  }
  process.exit(1);
}
