import "server-only";
import { prisma } from "@/lib/db/prisma";
import { appUrl, sendMail } from "@/lib/mail/mailer";

/**
 * One entry point for every alert: writes the in-app Notification row and,
 * when mail is enabled, sends the email too. Never throws — a notification
 * failure must not roll back the business action that triggered it.
 */

export type NotificationType =
  | "VACACION_APROBADA"
  | "VACACION_SOLICITADA"
  | "PLANILLA_APROBADA"
  | "PAGO_APLICADO"
  | "PROYECTO_VENCIDO";

export interface NotifyInput {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  /** Skip the email and only write the in-app row. */
  inAppOnly?: boolean;
}

export async function notify(input: NotifyInput): Promise<void> {
  if (input.userIds.length === 0) return;
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: input.userIds }, active: true },
      select: { id: true, email: true, name: true },
    });
    if (users.length === 0) return;

    // Created one by one so we keep each id: stamping emailedAt by id avoids
    // the MongoDB null-vs-unset trap (a `emailedAt: null` filter never matches
    // a document where the field was never written).
    const created = await Promise.all(
      users.map(async (u) => ({
        user: u,
        row: await prisma.notification.create({
          data: {
            userId: u.id,
            type: input.type,
            title: input.title,
            body: input.body,
            link: input.link ?? null,
          },
        }),
      })),
    );

    if (input.inAppOnly) return;

    await Promise.all(
      created.map(async ({ user, row }) => {
        const sent = await sendMail({
          to: user.email,
          subject: input.title,
          heading: input.title,
          text: input.body,
          actionUrl: input.link ? appUrl(input.link) : undefined,
          actionLabel: input.link ? "Abrir el sistema" : undefined,
        });
        if (sent) {
          await prisma.notification.update({
            where: { id: row.id },
            data: { emailedAt: new Date() },
          });
        }
      }),
    );
  } catch (error) {
    console.error("[notify] no se pudo notificar:", error);
  }
}

/** Recipients for owner-level alerts, excluding whoever triggered the action. */
export async function ownerIds(exceptUserId?: string): Promise<string[]> {
  const owners = await prisma.user.findMany({
    where: {
      role: "SUPER_ADMIN",
      active: true,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
    select: { id: true },
  });
  return owners.map((o) => o.id);
}

/** The user account linked to an employee, if that employee has portal access. */
export async function userIdForEmployee(employeeId: string): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { employeeId, active: true },
    select: { id: true },
  });
  return user ? [user.id] : [];
}
