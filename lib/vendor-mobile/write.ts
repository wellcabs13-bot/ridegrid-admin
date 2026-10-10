import { NextRequest } from "next/server";
import { findAlignmentIssues } from "@/lib/services/pricing/alignment";
import crypto from "crypto";
import {
  DriverStatus,
  FuelType,
  Prisma,
  TransmissionType,
  VehicleCategory,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPush, type PushNotice } from "@/lib/notifications/push";
import { passwordService } from "@/lib/auth/password";
import { findIdentityClash, normalizeMobile } from "@/lib/auth/identity";
import { sendAccountLink } from "@/lib/auth/account-email";
import {
  bookingReservationWindow,
  findBookingConflict,
  BLOCKING_BOOKING_STATUSES,
} from "@/lib/services/marketplace/BookingAvailabilityService";
import {
  vendorAccess,
  required,
  editableDriverScope,
  VendorError,
} from "./access";

type Access = Awaited<ReturnType<typeof vendorAccess>>;
function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T))
    throw new VendorError(400, `Choose a valid ${name}.`);
  return value as T;
}
function integer(value: unknown, name: string, max: number) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max)
    throw new VendorError(400, `Enter a valid ${name}.`);
  return n;
}
async function audit(
  tx: Prisma.TransactionClient,
  a: Access,
  entity: string,
  id: string,
  action: string,
) {
  await tx.auditLog.create({
    data: {
      userId: a.user.id,
      action: "UPDATE",
      entityName: entity,
      entityId: id,
      newValue: { action, vendorId: a.vendorId },
    },
  });
}
async function ownedVehicle(
  tx: Prisma.TransactionClient,
  vendorId: string,
  id: string,
) {
  const v = await tx.vehicle.findFirst({
    where: { id, vendorId, deletedAt: null },
  });
  if (!v) throw new VendorError(404, "Vehicle not found.");
  return v;
}
async function editableDriver(
  tx: Prisma.TransactionClient,
  vendorId: string,
  id: string,
) {
  const d = await tx.driver.findFirst({
    where: { id, ...editableDriverScope(vendorId) },
    include: { user: { select: { isActive: true, deletedAt: true } } },
  });
  if (!d)
    throw new VendorError(
      403,
      "This driver cannot be managed by your account. Contact Operations.",
    );
  return d;
}
async function noFutureBookings(
  tx: Prisma.TransactionClient,
  input: { vehicleId?: string; driverId?: string },
) {
  // Conservatively protect all unresolved assignments, including overdue trips.
  if (
    await tx.booking.findFirst({
      where: {
        deletedAt: null,
        status: { in: BLOCKING_BOOKING_STATUSES },
        ...input,
      },
      select: { id: true },
    })
  )
    throw new VendorError(
      409,
      "Resolve existing bookings with Operations before changing this assignment or status.",
    );
}

export async function writeVendor(
  request: NextRequest,
  section: string,
  a: Access,
) {
  const b = await request.json();
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw new VendorError(400, "Invalid request.");
  if (section === "notifications") {
    return prisma.notification.updateMany({
      where: {
        id: required(b.id, "notification"),
        userId: a.user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }
  if (section === "profile") {
    return prisma.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id: a.vendorId },
        data: {
          address: required(b.address, "address", 400),
          city: required(b.city, "city"),
          state: required(b.state, "state"),
          pinCode: required(b.pinCode, "postal code", 12),
        },
        select: { id: true },
      });
      await audit(tx, a, "Vendor", v.id, "CONTACT_UPDATED");
      return v;
    });
  }
  if (section === "fleet") {
    return prisma.$transaction(
      async (tx) => {
        const id = b.id ? required(b.id, "vehicle") : null;
        const current = id ? await ownedVehicle(tx, a.vendorId, id) : null;
        if (b.action === "status") {
          if (!current) throw new VendorError(404, "Vehicle not found.");
          const status = choice(
            b.status,
            ["AVAILABLE", "MAINTENANCE"] as const,
            "status",
          );
          if (!["AVAILABLE", "MAINTENANCE"].includes(current.status))
            throw new VendorError(
              409,
              "Operations must release this vehicle first.",
            );
          await noFutureBookings(tx, { vehicleId: current.id });
          await tx.vehicle.update({
            where: { id: current.id },
            data: { status },
          });
          await audit(tx, a, "Vehicle", current.id, "STATUS_UPDATED");
          return { id: current.id };
        }
        if (current) await noFutureBookings(tx, { vehicleId: current.id });
        const data = {
          registrationNumber: required(
            b.registrationNumber,
            "registration",
            24,
          ).toUpperCase(),
          make: required(b.make, "make"),
          model: required(b.model, "model"),
          homeCity: required(b.homeCity, "home city"),
          category: choice(
            b.category,
            Object.values(VehicleCategory),
            "category",
          ),
          fuelType: choice(b.fuelType, Object.values(FuelType), "fuel"),
          transmission: choice(
            b.transmission,
            Object.values(TransmissionType),
            "transmission",
          ),
          seatingCapacity: integer(b.seatingCapacity, "seat count", 100),
        };
        const saved = current
          ? await tx.vehicle.update({
              where: { id: current.id },
              data,
              select: { id: true },
            })
          : await tx.vehicle.create({
              data: {
                ...data,
                vendorId: a.vendorId,
                baseFare: 0,
                isVerified: false,
              },
              select: { id: true },
            });
        await audit(
          tx,
          a,
          "Vehicle",
          saved.id,
          current ? "DETAILS_UPDATED" : "CREATED",
        );
        return saved;
      },
      { isolationLevel: "Serializable" },
    );
  }
  if (section === "drivers") {
    // A new driver gets a unique temporary password, shown once to the vendor; the
    // first sign-in forces a new password. An activation email is also sent after commit.
    const temporaryPassword = !b.id ? passwordService.generateTemporaryPassword(12) : null;
    const password = temporaryPassword ? await passwordService.hash(temporaryPassword) : null;
    const result = await prisma.$transaction(
      async (tx) => {
        if (b.id) {
          const driver = await editableDriver(
            tx,
            a.vendorId,
            required(b.id, "driver"),
          );
          if (b.action === "status") {
            if (driver.status === "SUSPENDED")
              throw new VendorError(
                403,
                "Operations must release a suspended driver.",
              );
            await noFutureBookings(tx, { driverId: driver.id });
            await tx.driver.update({
              where: { id: driver.id },
              data: {
                status: choice(
                  b.status,
                  [DriverStatus.ACTIVE, DriverStatus.INACTIVE],
                  "status",
                ),
              },
            });
          } else {
            await tx.driver.update({
              where: { id: driver.id },
              data: {
                firstName: required(b.firstName, "first name"),
                lastName: required(b.lastName, "last name"),
                city: required(b.city, "city"),
              },
            });
            await tx.user.update({
              where: { id: driver.userId },
              data: {
                name: `${required(b.firstName, "first name")} ${required(b.lastName, "last name")}`,
              },
            });
          }
          await audit(tx, a, "Driver", driver.id, "UPDATED");
          return { id: driver.id };
        }
        const vehicle = await ownedVehicle(
          tx,
          a.vendorId,
          required(b.vehicleId, "vehicle"),
        );
        if (vehicle.driverId)
          throw new VendorError(
            409,
            "Choose a vehicle without an assigned driver.",
          );
        await noFutureBookings(tx, { vehicleId: vehicle.id });
        const email = required(b.email, "email", 254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new VendorError(400, "Enter a valid email.");
        const firstName = required(b.firstName, "first name"),
          lastName = required(b.lastName, "last name");
        const mobile = b.mobile ? normalizeMobile(required(b.mobile, "mobile", 20)) : null;
        const clash = await findIdentityClash({ role: "DRIVER", email, mobile }, tx);
        if (clash)
          throw new VendorError(409, clash === "email" ? "A driver with this email already exists." : "A driver with this mobile number already exists.");
        const driver = await tx.driver.create({
          data: {
            firstName,
            lastName,
            licenseNumber: required(b.licenseNumber, "licence"),
            city: required(b.city, "city"),
            user: {
              create: {
                name: `${firstName} ${lastName}`,
                email,
                password: password!,
                mustChangePassword: true,
                role: "DRIVER",
                mobile,
              },
            },
          },
          select: { id: true, userId: true },
        });
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { driverId: driver.id },
        });
        await audit(tx, a, "Driver", driver.id, "CREATED_AND_LINKED");
        return driver;
      },
      { isolationLevel: "Serializable" },
    );
    if (!b.id && "userId" in result) {
      const login = await prisma.user.findUnique({ where: { id: result.userId }, select: { id: true, email: true, name: true } });
      const activation = login ? await sendAccountLink(login, "ACTIVATION", "Driver") : { sent: false };
      return { id: result.id, activationEmailSent: activation.sent, email: login?.email ?? null, temporaryPassword };
    }
    return result;
  }
  if (section === "assignment") {
    // Push to the assigned driver is sent only after the assignment commits.
    let assigned: PushNotice | null = null;
    const result = await prisma.$transaction(
      async (tx) => {
        const vehicle = await ownedVehicle(
          tx,
          a.vendorId,
          required(b.vehicleId, "vehicle"),
        );
        const driver = await editableDriver(
          tx,
          a.vendorId,
          required(b.driverId, "driver"),
        );
        if (
          !a.approved ||
          !vehicle.isVerified ||
          vehicle.status !== "AVAILABLE" ||
          driver.status !== "ACTIVE" ||
          !driver.user.isActive ||
          driver.user.deletedAt
        )
          throw new VendorError(
            409,
            "An approved vendor, verified available vehicle and active driver are required.",
          );
        if (b.bookingId) {
          const booking = await tx.booking.findFirst({
            where: {
              id: required(b.bookingId, "booking"),
              vendorId: a.vendorId,
              vehicleId: vehicle.id,
              deletedAt: null,
            },
          });
          if (!booking) throw new VendorError(404, "Booking not found.");
          if (
            !["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"].includes(
              booking.status,
            )
          )
            throw new VendorError(
              409,
              "This booking can no longer be assigned.",
            );
          if (vehicle.driverId !== driver.id)
            throw new VendorError(
              409,
              "Confirm the driver currently aligned to the exact booked vehicle. Contact Operations for a booking reassignment.",
            );
          if (booking.driverId && booking.driverId !== driver.id)
            throw new VendorError(
              409,
              "Operations must approve a change to the booked driver.",
            );
          if (
            await findBookingConflict(tx, {
              vehicleId: vehicle.id,
              driverId: driver.id,
              window: bookingReservationWindow(booking),
              excludeBookingId: booking.id,
            })
          )
            throw new VendorError(
              409,
              "Vehicle or driver has a conflicting reservation.",
            );
          if (
            booking.status === "DRIVER_ASSIGNED" &&
            booking.driverId === driver.id
          )
            return { id: booking.id };
          await tx.booking.update({
            where: { id: booking.id },
            data: { driverId: driver.id, status: "DRIVER_ASSIGNED" },
          });
          await tx.bookingStatusHistory.create({
            data: {
              bookingId: booking.id,
              previousStatus: booking.status,
              currentStatus: "DRIVER_ASSIGNED",
              action: "ASSIGNED",
              changedBy: a.user.id,
            },
          });
          await audit(tx, a, "Booking", booking.id, "ASSIGNMENT_CONFIRMED");
          const notice = { userId: driver.userId, title: "New driver assignment", message: `${booking.bookingNumber}: your trip assignment is ready. Open My Trips for details.` };
          await tx.notification.create({ data: { ...notice, notificationType: "PUSH" } });
          assigned = { ...notice, target: { type: "booking", id: booking.id, bookingNumber: booking.bookingNumber } };
          return { id: booking.id };
        }
        await noFutureBookings(tx, { vehicleId: vehicle.id });
        await noFutureBookings(tx, { driverId: driver.id });
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { driverId: driver.id },
        });
        await audit(tx, a, "Vehicle", vehicle.id, "DRIVER_ALIGNED");
        return { id: vehicle.id };
      },
      { isolationLevel: "Serializable" },
    );
    if (assigned) void sendPush([assigned]);
    // Re-aligning a driver can strand approved fares priced for the previous car/driver pair; tell the vendor, change nothing.
    const rateWarnings = result && typeof result === "object" && "id" in result && !assigned
      ? (await findAlignmentIssues(prisma, { vehicleId: String(result.id) }).catch(() => []))
      : [];
    return rateWarnings.length ? { ...result, rateWarnings } : result;
  }
  throw new VendorError(404, "Action not found.");
}
