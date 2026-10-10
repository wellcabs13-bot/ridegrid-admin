import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Where an in-app notification should open. Notifications store only title and
// message, so the target is derived on read: a booking number in the message is
// resolved ONLY against the caller's own bookings (the scope), and the fixed approval
// titles written by the automation rules map to the approval screens. Anything else
// has no target and simply opens nothing.
export type NotificationTarget =
  | { type: "booking"; id: string; bookingNumber: string }
  | { type: "approvals" }
  | { type: "reviews" };

const APPROVAL_TITLES: Record<string, NotificationTarget> = {
  "Approval requested": { type: "approvals" },
  "Ride request approved": { type: "approvals" },
  "Ride request rejected": { type: "approvals" },
  "Travel approval required": { type: "reviews" },
};

export const approvalTarget = (title: string): NotificationTarget | null => APPROVAL_TITLES[title] ?? null;

// Booking references such as WC1009 (letters, optional dashes, then digits).
const BOOKING_REF = /\b[A-Z][A-Z0-9-]*\d{3,}\b/g;

export async function withNotificationTargets<T extends { title: string; message: string }>(
  items: T[],
  ownBookings: Prisma.BookingWhereInput,
  options: { approvals?: boolean } = {},
): Promise<(T & { target: NotificationTarget | null })[]> {
  const refs = [...new Set(items.flatMap((n) => n.message.match(BOOKING_REF) ?? []))].slice(0, 100);
  const bookings = refs.length
    ? await prisma.booking.findMany({ where: { AND: [ownBookings, { bookingNumber: { in: refs }, deletedAt: null }] }, select: { id: true, bookingNumber: true } })
    : [];
  const byNumber = new Map(bookings.map((b) => [b.bookingNumber, b.id]));
  return items.map((n) => {
    const ref = (n.message.match(BOOKING_REF) ?? []).find((r) => byNumber.has(r));
    const target: NotificationTarget | null = ref
      ? { type: "booking", id: byNumber.get(ref)!, bookingNumber: ref }
      : options.approvals ? APPROVAL_TITLES[n.title] ?? null : null;
    return { ...n, target };
  });
}
