import { Prisma } from "@prisma/client";
// Reuse the platform notification inbox. No claim of registered device push delivery.
export async function notifyAssignedDriver(tx: Prisma.TransactionClient, bookingId: string, title: string) {
  const b = await tx.booking.findUnique({ where: { id: bookingId }, select: { bookingNumber: true, driver: { select: { userId: true } } } });
  if (b?.driver) await tx.notification.create({ data: { userId: b.driver.userId, notificationType: "PUSH", title, message: `${b.bookingNumber}: ${title}. Refresh My Trips for current details.` } });
}
