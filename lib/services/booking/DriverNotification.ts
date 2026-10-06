import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/notifications/push";
// Reuse the platform notification inbox. Device push is sent separately, after commit.
const text = (bookingNumber: string, title: string) => `${bookingNumber}: ${title}. Refresh My Trips for current details.`;
export async function notifyAssignedDriver(tx: Prisma.TransactionClient, bookingId: string, title: string) {
  const b = await tx.booking.findUnique({ where: { id: bookingId }, select: { bookingNumber: true, driver: { select: { userId: true } } } });
  if (b?.driver) await tx.notification.create({ data: { userId: b.driver.userId, notificationType: "PUSH", title, message: text(b.bookingNumber, title) } });
}
// Post-commit mirror of notifyAssignedDriver as device push. Best-effort, never throws.
export async function pushAssignedDriver(bookingId: string, title: string) {
  try {
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { id: true, bookingNumber: true, driver: { select: { userId: true } } } });
    if (b?.driver) void sendPush([{ userId: b.driver.userId, title, message: text(b.bookingNumber, title), target: { type: "booking", id: b.id, bookingNumber: b.bookingNumber } }]);
  } catch {
    // The in-app notification is already stored.
  }
}
