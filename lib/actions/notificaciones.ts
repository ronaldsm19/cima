"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/access";
import { nullOrUnset } from "@/lib/db/filters";
import { prisma } from "@/lib/db/prisma";

/** Marks the signed-in user's notifications as read (all, or just one). */
export async function marcarLeidas(notificationId?: string): Promise<{ ok: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false };

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      ...nullOrUnset("readAt"),
      ...(notificationId ? { id: notificationId } : {}),
    },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
