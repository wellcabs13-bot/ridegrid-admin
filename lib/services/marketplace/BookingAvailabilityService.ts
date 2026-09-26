import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.DRIVER_ASSIGNED,
  BookingStatus.TRIP_STARTED,
];

export type ReservationWindow = {
  start: Date;
  end: Date;
  days: number;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

type BookingCandidate = {
  id: string;
  bookingNumber: string;
  vehicleId: string;
  driverId: string | null;
  pickupDateTime: Date;
  reservedFrom: Date | null;
  reservedUntil: Date | null;
  tripDays: number;
  priceSnapshot: Prisma.JsonValue | null;
};

function validDays(value: unknown, fallback = 1) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0
    ? number
    : fallback;
}

function indiaDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to resolve India calendar date.");
  }

  return `${year}-${month}-${day}`;
}

function indiaMidnight(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid reservation date.");
  }

  const value = new Date(`${dateKey}T00:00:00+05:30`);

  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid reservation date.");
  }

  return value;
}

export function reservationWindowFromDate(
  dateKey: string,
  requestedDays = 1
): ReservationWindow {
  const days = validDays(requestedDays);
  const start = indiaMidnight(dateKey);

  return {
    start,
    end: new Date(start.getTime() + days * 24 * 60 * 60 * 1000),
    days,
  };
}

export function reservationWindowFromPickup(
  pickupDateTime: Date,
  requestedDays = 1
): ReservationWindow {
  return reservationWindowFromDate(
    indiaDateKey(pickupDateTime),
    requestedDays
  );
}

export function tripDaysFromSnapshot(
  snapshot: unknown,
  fallback = 1
) {
  const value = Number(
    (
      snapshot as {
        tripMetrics?: {
          days?: unknown;
        };
      } | null
    )?.tripMetrics?.days
  );

  return validDays(value, validDays(fallback));
}

export function windowsOverlap(
  first: ReservationWindow,
  second: ReservationWindow
) {
  return (
    first.start.getTime() < second.end.getTime() &&
    first.end.getTime() > second.start.getTime()
  );
}

export function bookingReservationWindow(
  booking: Pick<
    BookingCandidate,
    | "pickupDateTime"
    | "reservedFrom"
    | "reservedUntil"
    | "tripDays"
    | "priceSnapshot"
  >
): ReservationWindow {
  if (
    booking.reservedFrom &&
    booking.reservedUntil &&
    booking.reservedUntil.getTime() >
      booking.reservedFrom.getTime()
  ) {
    return {
      start: booking.reservedFrom,
      end: booking.reservedUntil,
      days: validDays(booking.tripDays),
    };
  }

  const days = tripDaysFromSnapshot(
    booking.priceSnapshot,
    booking.tripDays
  );

  return reservationWindowFromPickup(
    booking.pickupDateTime,
    days
  );
}

function conflictSelect() {
  return {
    id: true,
    bookingNumber: true,
    vehicleId: true,
    driverId: true,
    pickupDateTime: true,
    reservedFrom: true,
    reservedUntil: true,
    tripDays: true,
    priceSnapshot: true,
  } as const;
}

export async function findBookingConflict(
  db: DbClient,
  input: {
    vehicleId?: string | null;
    driverId?: string | null;
    window: ReservationWindow;
    excludeBookingId?: string;
  }
) {
  const OR: Prisma.BookingWhereInput[] = [];

  if (input.vehicleId) {
    OR.push({ vehicleId: input.vehicleId });
  }

  if (input.driverId) {
    OR.push({ driverId: input.driverId });
  }

  if (!OR.length) {
    return null;
  }

  const candidates = await db.booking.findMany({
    where: {
      deletedAt: null,
      status: {
        in: BLOCKING_BOOKING_STATUSES,
      },
      ...(input.excludeBookingId
        ? {
            id: {
              not: input.excludeBookingId,
            },
          }
        : {}),
      pickupDateTime: {
        lt: input.window.end,
      },
      OR,
    },
    select: conflictSelect(),
    orderBy: {
      pickupDateTime: "asc",
    },
  });

  for (const booking of candidates) {
    const existing = bookingReservationWindow(
      booking as BookingCandidate
    );

    if (windowsOverlap(existing, input.window)) {
      return {
        booking,
        existing,
        vehicleConflict:
          Boolean(input.vehicleId) &&
          booking.vehicleId === input.vehicleId,
        driverConflict:
          Boolean(input.driverId) &&
          booking.driverId === input.driverId,
      };
    }
  }

  return null;
}

export async function findUnavailableAssignments(
  db: DbClient,
  input: {
    vehicleIds: string[];
    driverIds: string[];
    window: ReservationWindow;
  }
) {
  const vehicleIds = [...new Set(input.vehicleIds.filter(Boolean))];
  const driverIds = [...new Set(input.driverIds.filter(Boolean))];

  const unavailableVehicleIds = new Set<string>();
  const unavailableDriverIds = new Set<string>();

  const OR: Prisma.BookingWhereInput[] = [];

  if (vehicleIds.length) {
    OR.push({
      vehicleId: {
        in: vehicleIds,
      },
    });
  }

  if (driverIds.length) {
    OR.push({
      driverId: {
        in: driverIds,
      },
    });
  }

  if (!OR.length) {
    return {
      unavailableVehicleIds,
      unavailableDriverIds,
    };
  }

  const candidates = await db.booking.findMany({
    where: {
      deletedAt: null,
      status: {
        in: BLOCKING_BOOKING_STATUSES,
      },
      pickupDateTime: {
        lt: input.window.end,
      },
      OR,
    },
    select: conflictSelect(),
  });

  for (const booking of candidates) {
    const existing = bookingReservationWindow(
      booking as BookingCandidate
    );

    if (!windowsOverlap(existing, input.window)) {
      continue;
    }

    if (vehicleIds.includes(booking.vehicleId)) {
      unavailableVehicleIds.add(booking.vehicleId);
    }

    if (
      booking.driverId &&
      driverIds.includes(booking.driverId)
    ) {
      unavailableDriverIds.add(booking.driverId);
    }
  }

  return {
    unavailableVehicleIds,
    unavailableDriverIds,
  };
}