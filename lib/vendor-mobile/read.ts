import { NextRequest } from "next/server";
import {
  BookingStatus,
  VehicleCategory,
  VehicleStatus,
  DriverStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { driverScope, pageNumber, VendorError } from "./access";
import { bookingSelect, documentSelect, vehicleSelect } from "./selects";
import {
  findUnavailableAssignments,
  reservationWindowFromDate,
  reservationWindowFromPickup,
} from "@/lib/services/marketplace/BookingAvailabilityService";
import { WELLCABS } from "@/lib/website-public/brand";

export async function readVendor(
  request: NextRequest,
  section: string,
  vendorId: string,
  userId: string,
) {
  const p = request.nextUrl.searchParams,
    id = p.get("id"),
    page = pageNumber(p.get("page"));
  const paging = { take: 30, skip: (page - 1) * 30 };
  const list = (items: unknown[]) => ({
    items,
    page,
    hasMore: items.length === 30,
  });
  if (section === "config")
    return {
      support: WELLCABS,
      categories: Object.values(VehicleCategory),
      fuels: ["PETROL", "DIESEL", "CNG", "ELECTRIC", "HYBRID"],
      transmissions: ["MANUAL", "AUTOMATIC"],
      images: false,
      notificationLinks: false,
      acceptReject: false,
      tripTransitions: false,
    };
  if (section === "home") {
    const today = reservationWindowFromPickup(new Date());
    const where = { vendorId, deletedAt: null };
    const [
      todayBookings,
      upcoming,
      active,
      pending,
      fleet,
      drivers,
      nextTrips,
      notifications,
      expiringDocuments,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          ...where,
          pickupDateTime: { gte: today.start, lt: today.end },
        },
      }),
      prisma.booking.count({
        where: {
          ...where,
          pickupDateTime: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"] },
        },
      }),
      prisma.booking.count({ where: { ...where, status: "TRIP_STARTED" } }),
      prisma.booking.count({
        where: {
          ...where,
          status: { in: ["PENDING", "CONFIRMED"] },
          driverId: null,
        },
      }),
      prisma.vehicle.findMany({ where, select: { id: true, status: true } }),
      prisma.driver.findMany({
        where: driverScope(vendorId),
        select: { id: true, status: true },
      }),
      prisma.booking.findMany({
        where: {
          ...where,
          pickupDateTime: { gte: today.start },
          status: {
            in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED"],
          },
        },
        select: bookingSelect,
        orderBy: { pickupDateTime: "asc" },
        take: 5,
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { id: true, title: true, message: true, readAt: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.vehicleDocument.count({
        where: {
          vehicle: where,
          expiryDate: { lte: new Date(Date.now() + 30 * 86400000) },
        },
      }),
    ]);
    const availability = await findUnavailableAssignments(prisma, {
      vehicleIds: fleet.map((v) => v.id),
      driverIds: drivers.map((d) => d.id),
      window: today,
    });
    return {
      todayBookings,
      upcoming,
      active,
      pending,
      availableVehicles: fleet.filter(
        (v) =>
          v.status === "AVAILABLE" &&
          !availability.unavailableVehicleIds.has(v.id),
      ).length,
      bookedVehicles: availability.unavailableVehicleIds.size,
      availableDrivers: drivers.filter(
        (d) =>
          d.status === "ACTIVE" && !availability.unavailableDriverIds.has(d.id),
      ).length,
      assignedDrivers: availability.unavailableDriverIds.size,
      attentionVehicles: fleet.filter((v) =>
        ["MAINTENANCE", "BLOCKED"].includes(v.status),
      ).length,
      expiringDocuments,
      nextTrips,
      notifications,
      asOf: new Date(),
    };
  }
  if (section === "bookings") {
    const where: Prisma.BookingWhereInput = {
      vendorId,
      deletedAt: null,
      ...(id ? { id } : {}),
    };
    const status = p.get("status");
    if (status === "UPCOMING")
      Object.assign(where, {
        pickupDateTime: { gte: new Date() },
        status: { in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"] },
      });
    else if (status) {
      if (!Object.values(BookingStatus).includes(status as BookingStatus))
        throw new VendorError(400, "Invalid booking status.");
      where.status = status as BookingStatus;
    }
    if (id) {
      const row = await prisma.booking.findFirst({
        where,
        select: {
          ...bookingSelect,
          statusHistory: {
            select: {
              id: true,
              currentStatus: true,
              action: true,
              changedAt: true,
            },
            orderBy: { changedAt: "asc" },
          },
          transactions: {
            select: { paymentStatus: true, paymentMethod: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (!row) throw new VendorError(404, "Booking not found.");
      return row;
    }
    return list(
      await prisma.booking.findMany({
        where,
        select: bookingSelect,
        orderBy: [{ pickupDateTime: "desc" }, { id: "desc" }],
        ...paging,
      }),
    );
  }
  if (section === "fleet") {
    const where: Prisma.VehicleWhereInput = {
      vendorId,
      deletedAt: null,
      ...(id ? { id } : {}),
    };
    const search = p.get("search")?.slice(0, 100),
      status = p.get("status"),
      category = p.get("category");
    if (search)
      where.OR = ["registrationNumber", "make", "model"].map((key) => ({
        [key]: { contains: search, mode: "insensitive" },
      }));
    if (
      status &&
      Object.values(VehicleStatus).includes(status as VehicleStatus)
    )
      where.status = status as VehicleStatus;
    if (
      category &&
      Object.values(VehicleCategory).includes(category as VehicleCategory)
    )
      where.category = category as VehicleCategory;
    if (id) {
      const row = await prisma.vehicle.findFirst({
        where,
        select: vehicleSelect,
      });
      if (!row) throw new VendorError(404, "Vehicle not found.");
      return row;
    }
    return list(
      await prisma.vehicle.findMany({
        where,
        select: vehicleSelect,
        orderBy: { id: "asc" },
        ...paging,
      }),
    );
  }
  if (section === "drivers") {
    const where: Prisma.DriverWhereInput = {
      ...driverScope(vendorId),
      ...(id ? { id } : {}),
    };
    const search = p.get("search")?.slice(0, 100),
      status = p.get("status");
    if (search)
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    if (status && Object.values(DriverStatus).includes(status as DriverStatus))
      where.status = status as DriverStatus;
    if (status === "ON_TRIP")
      where.bookings = {
        some: { vendorId, deletedAt: null, status: "TRIP_STARTED" },
      };
    if (status === "ASSIGNED")
      where.bookings = {
        some: {
          vendorId,
          deletedAt: null,
          status: {
            in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED"],
          },
        },
      };
    if (status === "AVAILABLE") {
      const candidates = await prisma.driver.findMany({
        where: {
          ...driverScope(vendorId),
          status: "ACTIVE",
          user: { isActive: true, deletedAt: null },
        },
        select: { id: true },
      });
      const unavailable = await findUnavailableAssignments(prisma, {
        vehicleIds: [],
        driverIds: candidates.map((d) => d.id),
        window: reservationWindowFromPickup(new Date()),
      });
      where.AND = [
        {
          id: {
            in: candidates
              .filter((d) => !unavailable.unavailableDriverIds.has(d.id))
              .map((d) => d.id),
          },
        },
      ];
    }
    const select = {
      id: true,
      firstName: true,
      lastName: true,
      licenseNumber: true,
      status: true,
      city: true,
      user: { select: { mobile: true } },
      documents: { select: documentSelect },
      vehicles: {
        where: { vendorId, deletedAt: null },
        select: { id: true, registrationNumber: true },
      },
      bookings: {
        where: {
          vendorId,
          deletedAt: null,
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.CONFIRMED,
              BookingStatus.DRIVER_ASSIGNED,
              BookingStatus.TRIP_STARTED,
            ],
          },
        },
        select: bookingSelect,
        orderBy: { pickupDateTime: "asc" as const },
        take: 5,
      },
    } satisfies Prisma.DriverSelect;
    if (id) {
      const row = await prisma.driver.findFirst({ where, select });
      if (!row) throw new VendorError(404, "Driver not found.");
      return row;
    }
    return list(
      await prisma.driver.findMany({
        where,
        select,
        orderBy: { id: "asc" },
        ...paging,
      }),
    );
  }
  if (section === "availability") {
    const date =
      p.get("date") ||
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
        new Date(),
      );
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00+05:30`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
    )
      throw new VendorError(400, "Enter a valid calendar date.");
    const window = reservationWindowFromDate(date);
    const [vehicles, drivers] = await Promise.all([
      prisma.vehicle.findMany({
        where: { vendorId, deletedAt: null },
        select: { id: true, registrationNumber: true, status: true },
        orderBy: { id: "asc" },
        ...paging,
      }),
      prisma.driver.findMany({
        where: driverScope(vendorId),
        select: { id: true, firstName: true, lastName: true, status: true },
        orderBy: { id: "asc" },
        ...paging,
      }),
    ]);
    const unavailable = await findUnavailableAssignments(prisma, {
      vehicleIds: vehicles.map((v) => v.id),
      driverIds: drivers.map((d) => d.id),
      window,
    });
    return {
      date,
      window,
      page,
      hasMore: vehicles.length === 30 || drivers.length === 30,
      vehicles: vehicles.map((v) => ({
        ...v,
        available:
          v.status === "AVAILABLE" &&
          !unavailable.unavailableVehicleIds.has(v.id),
      })),
      drivers: drivers.map((d) => ({
        ...d,
        available:
          d.status === "ACTIVE" && !unavailable.unavailableDriverIds.has(d.id),
      })),
    };
  }
  if (section === "profile") {
    const vendor = await prisma.vendor.findUniqueOrThrow({
      where: { id: vendorId },
      select: {
        id: true,
        companyName: true,
        address: true,
        city: true,
        state: true,
        pinCode: true,
        homeCity: true,
        isApproved: true,
        bankName: true,
        accountNumber: true,
        user: {
          select: { name: true, email: true, mobile: true, isVerified: true },
        },
        documents: { select: documentSelect },
      },
    });
    return {
      ...vendor,
      accountNumber: undefined,
      accountLast4: vendor.accountNumber?.slice(-4) || null,
    };
  }
  if (section === "notifications") {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          message: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...paging,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...list(items), unread };
  }
  if (section === "earnings") {
    const [wallet, settlements, totals, completed] = await Promise.all([
      prisma.vendorWallet.findUnique({
        where: { vendorId },
        select: { balance: true },
      }),
      prisma.vendorSettlement.findMany({
        where: { vendorId },
        select: {
          id: true,
          netAmount: true,
          settlementStatus: true,
          settledAt: true,
          createdAt: true,
          settlementReference: true,
        },
        orderBy: { createdAt: "desc" },
        ...paging,
      }),
      prisma.vendorSettlement.groupBy({
        by: ["settlementStatus"],
        where: { vendorId },
        _sum: { netAmount: true },
      }),
      prisma.booking.findMany({
        where: { vendorId, deletedAt: null, status: "TRIP_COMPLETED" },
        select: { id: true, bookingNumber: true, vendorEarning: true },
        orderBy: { pickupDateTime: "desc" },
        ...paging,
      }),
    ]);
    return {
      wallet,
      settlements,
      totals,
      completed,
      page,
      hasMore: settlements.length === 30 || completed.length === 30,
    };
  }
  throw new VendorError(404, "Page not found.");
}
