/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Changes a user's password without touching anything else.
 * Usage: npm run user:password -- correo@dominio.cr "nueva contraseña"
 *
 * Needed because the seed never overwrites an existing passwordHash: the
 * seed credentials are development-only and must be replaced before the app
 * is reachable from the internet.
 */
const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Uso: npm run user:password -- correo@dominio.cr "nueva contraseña"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("La contraseña tiene que tener al menos 10 caracteres.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    console.error(`No existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✓ Contraseña actualizada para ${user.name} (${user.email}, rol ${user.role}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
