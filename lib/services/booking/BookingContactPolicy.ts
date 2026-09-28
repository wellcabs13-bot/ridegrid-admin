import { Prisma } from "@prisma/client";

// Who may see which contact details on a booking, and when.
// - Staff (Super Admin / Operations / Finance): operational contacts.
// - The booking's own vendor: its own contact, and passenger contact while live.
// - The traveller / corporate booker: driver name always, driver mobile only while
//   the assignment is live; never vendor account contact.
// Vendor bank details, driver identity documents, payout/revenue splits and gateway
// data are never selected.

const STAFF = new Set(["SUPER_ADMIN", "OPERATIONS", "FINANCE"]);
export const LIVE_BOOKING_STATUSES = new Set(["DRIVER_ASSIGNED", "TRIP_STARTED"]);

export const bookingViewSelect = {
  id: true, bookingNumber: true, bookingSource: true, status: true, tripType: true, tripDays: true,
  pickupLocation: true, dropLocation: true, pickupDateTime: true, createdAt: true, holdExpiresAt: true,
  estimatedFare: true, baseFare: true, taxAmount: true, discountAmount: true, couponAmount: true, extraCharges: true, finalFare: true,
  vendorEarning: true, cancelReason: true, cancelledAt: true, refundAmount: true,
  customer: { select: { id: true, firstName: true, lastName: true, user: { select: { id: true, name: true, email: true, mobile: true } } } },
  vendor: { select: { id: true, companyName: true, userId: true, user: { select: { name: true, email: true, mobile: true } } } },
  vehicle: { select: { id: true, make: true, model: true, variant: true, category: true, fuelType: true, transmission: true, seatingCapacity: true, luggageCapacity: true, year: true, color: true, registrationNumber: true } },
  driver: { select: { id: true, firstName: true, lastName: true, user: { select: { mobile: true } } } },
  trip: { select: { status: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true } },
  transactions: { where: { transactionType: "BOOKING_PAYMENT" as const }, orderBy: { createdAt: "desc" as const }, take: 1, select: { paymentMethod: true, paymentStatus: true, amount: true } },
  statusHistory: { orderBy: { createdAt: "desc" as const }, select: { previousStatus: true, currentStatus: true, changedAt: true } },
} satisfies Prisma.BookingSelect;

export type BookingViewRow = Prisma.BookingGetPayload<{ select: typeof bookingViewSelect }>;

export function bookingView(b: BookingViewRow, viewer: { id: string; role: string }) {
  const staff = STAFF.has(viewer.role);
  const ownVendor = viewer.role === "VENDOR" && b.vendor.userId === viewer.id;
  const live = LIVE_BOOKING_STATUSES.has(b.status);
  const { vendorEarning, vendor, customer, driver, transactions, ...rest } = b;
  return {
    ...rest,
    ...(staff || ownVendor ? { vendorEarning } : {}),
    customer: {
      id: customer.id, firstName: customer.firstName, lastName: customer.lastName,
      user: staff || !ownVendor || live ? customer.user : { id: customer.user.id, name: customer.user.name },
    },
    vendor: staff || ownVendor
      ? { id: vendor.id, companyName: vendor.companyName, user: vendor.user }
      : { id: vendor.id, companyName: vendor.companyName },
    driver: driver
      ? { id: driver.id, user: { name: `${driver.firstName} ${driver.lastName}`.trim(), mobile: staff || live ? driver.user?.mobile ?? null : null } }
      : null,
    transactions: transactions.map(t => ({ ...t, amount: Number(t.amount) })),
  };
}
