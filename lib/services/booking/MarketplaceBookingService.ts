import {
  Booking,
  BookingSource,
  BookingStatus,
  BookingStatusAction,
  DriverStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TransactionType,
  TripType,
  VehicleStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consumeQuote, Snapshot } from "@/lib/services/pricing/QuoteService";
import { json } from "@/lib/services/pricing/RateService";
import { chargeCorporateCredit } from "@/lib/services/corporate/CorporateCreditService";
import { generateBookingNumber } from "@/lib/services/booking/BookingNumberService";
import { findBookingConflict, ReservationWindow } from "@/lib/services/marketplace/BookingAvailabilityService";

// Shared marketplace booking commit used by the website/customer checkout and the
// corporate employee app. One booking table, one quote consumption, one conflict check.
export class MarketplaceBookingError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "MarketplaceBookingError"; }
}
export class BookingConflictError extends Error {
  constructor(message: string) { super(message); this.name = "BookingConflictError"; }
}

export async function loadBookableListing(listingId: string, pricingPackageId: string, window: ReservationWindow) {
  const packageData = await prisma.pricingPackage.findFirst({ where: { id: pricingPackageId, vehicleId: listingId, isActive: true } });
  if (!packageData) throw new MarketplaceBookingError(409, "Selected pricing is no longer active.");
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: listingId, deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true },
    include: { vendor: { include: { user: true } }, driver: { include: { user: true } } },
  });
  if (!vehicle) throw new MarketplaceBookingError(409, "Selected vehicle is no longer available.");
  if (!vehicle.vendor || vehicle.vendor.deletedAt !== null || !vehicle.vendor.isApproved || !vehicle.vendor.user.isActive || vehicle.vendor.user.deletedAt !== null)
    throw new MarketplaceBookingError(409, "Selected vendor is not currently available.");
  if (vehicle.driver && (vehicle.driver.deletedAt !== null || vehicle.driver.status !== DriverStatus.ACTIVE || !vehicle.driver.user.isActive || vehicle.driver.user.deletedAt !== null))
    throw new MarketplaceBookingError(409, "Assigned driver is not currently available.");
  const conflict = await findBookingConflict(prisma, { vehicleId: vehicle.id, driverId: vehicle.driverId, window });
  if (conflict)
    throw new MarketplaceBookingError(409, conflict.vehicleConflict
      ? "This vehicle is already booked for one or more selected travel dates."
      : "The assigned driver is already booked for one or more selected travel dates.");
  return { packageData, vehicle };
}

export type CommitMarketplaceBooking = {
  quoteId: string;
  ownerId: string;
  snapshot: Snapshot;
  vehicle: { id: string; vendorId: string };
  pricingPackageId: string;
  customerId: string;
  corporateId: string | null;
  bookingSource: BookingSource;
  tripType: TripType;
  pickupAddress: string;
  dropAddress: string;
  pickupDateTime: Date;
  window: ReservationWindow;
  discountAmount: number;
  finalFare: number;
  paymentMethod: PaymentMethod;
  changedBy?: string | null;
  afterCreate?: (tx: Prisma.TransactionClient, booking: Booking) => Promise<void>;
};

export async function commitMarketplaceBooking(input: CommitMarketplaceBooking) {
  const corporateCredit = input.paymentMethod === PaymentMethod.CORPORATE_CREDIT;
  return prisma.$transaction(async (tx) => {
    await consumeQuote(tx, input.quoteId, input.ownerId, input.vehicle.id);
    const currentVehicle = await tx.vehicle.findFirst({
      where: { id: input.vehicle.id, deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true },
    });
    if (!currentVehicle) throw new Error("Vehicle became unavailable. Please search again.");
    const existingBooking = await findBookingConflict(tx, { vehicleId: input.vehicle.id, driverId: currentVehicle.driverId, window: input.window });
    if (existingBooking)
      throw new BookingConflictError(existingBooking.vehicleConflict
        ? "This vehicle was just booked for one or more selected travel dates."
        : "The assigned driver was just booked for one or more selected travel dates.");
    const s = input.snapshot;
    const created = await tx.booking.create({
      data: {
        bookingNumber: await generateBookingNumber(tx),
        bookingSource: input.bookingSource,
        customerId: input.customerId,
        vendorId: input.vehicle.vendorId,
        vehicleId: input.vehicle.id,
        driverId: currentVehicle.driverId,
        pricingPackageId: input.pricingPackageId,
        tripType: input.tripType,
        corporateId: input.corporateId,
        pickupLocation: input.pickupAddress,
        dropLocation: input.dropAddress,
        pickupDateTime: input.pickupDateTime,
        reservedFrom: input.window.start,
        reservedUntil: input.window.end,
        tripDays: input.window.days,
        status: BookingStatus.CONFIRMED,
        priceSnapshot: json(s),
        pricingQuoteId: input.quoteId,
        estimatedFare: s.finalPayable,
        baseFare: s.vendorFare,
        taxAmount: s.taxAmount,
        discountAmount: input.discountAmount,
        couponAmount: input.discountAmount,
        extraCharges: s.passThroughTotal,
        finalFare: s.finalPayable,
        vendorEarning: s.vendorPayout,
        platformCommission: 0,
        driverPayout: 0,
      },
    });
    if (corporateCredit) await chargeCorporateCredit(tx, input.corporateId || "", input.finalFare, created.id);
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: created.id, previousStatus: null, currentStatus: BookingStatus.CONFIRMED, action: BookingStatusAction.CREATED,
        changedBy: input.changedBy ?? null,
        remarks: corporateCredit ? "Marketplace booking confirmed with Corporate Credit Account." : "Marketplace booking confirmed with Cash on Pickup.",
      },
    });
    await tx.transaction.create({
      data: {
        bookingId: created.id, vendorId: input.vehicle.vendorId, transactionType: TransactionType.BOOKING_PAYMENT,
        paymentMethod: input.paymentMethod,
        paymentStatus: corporateCredit ? PaymentStatus.PAID : PaymentStatus.PENDING,
        amount: input.finalFare, currency: "INR",
        referenceNumber: corporateCredit ? `CORP-${created.bookingNumber}` : `CASH-${created.bookingNumber}`,
        gatewayName: corporateCredit ? "CORPORATE_CREDIT" : "CASH",
        processedAt: corporateCredit ? new Date() : null,
        remarks: corporateCredit ? "Corporate Credit Account" : "Cash on Pickup",
      },
    });
    if (input.afterCreate) await input.afterCreate(tx, created);
    return created;
  }, { isolationLevel: "Serializable" });
}
