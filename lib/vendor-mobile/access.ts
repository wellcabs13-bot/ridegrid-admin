import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requestUser } from "@/lib/request-access";
import { prisma } from "@/lib/prisma";

export class VendorError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function vendorAccess(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) throw new VendorError(401, "Please sign in.");
  if (user.role !== "VENDOR")
    throw new VendorError(403, "A vendor account is required.");
  const origin = request.headers.get("origin");
  if (
    !["GET", "HEAD"].includes(request.method) &&
    ((origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    throw new VendorError(403, "Cross-site changes are not allowed.");
  const vendor = await prisma.vendor.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, isApproved: true },
  });
  if (!vendor)
    throw new VendorError(403, "Your vendor profile is unavailable.");
  return { user, vendorId: vendor.id, approved: vendor.isApproved };
}
export function driverScope(vendorId: string): Prisma.DriverWhereInput {
  return { deletedAt: null, vehicles: { some: { vendorId, deletedAt: null } } };
}
// A shared driver can be viewed through an owned vehicle, but cannot be changed
// by one vendor on behalf of another vendor.
export function editableDriverScope(vendorId: string): Prisma.DriverWhereInput {
  return {
    ...driverScope(vendorId),
    AND: [
      { vehicles: { none: { vendorId: { not: vendorId }, deletedAt: null } } },
      {
        bookings: {
          none: {
            vendorId: { not: vendorId },
            deletedAt: null,
            status: {
              in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED"],
            },
          },
        },
      },
    ],
  };
}
export const ok = (data: unknown) =>
  NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
export function vendorFailure(error: unknown) {
  if (error instanceof VendorError)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 },
    );
  const code =
    error && typeof error === "object" && "code" in error ? error.code : "";
  return NextResponse.json(
    {
      success: false,
      message:
        code === "P2002"
          ? "This record already exists."
          : code === "P2034"
            ? "The record changed. Refresh and try again."
            : "Unable to complete this request. Please retry.",
    },
    { status: code === "P2002" || code === "P2034" ? 409 : 500 },
  );
}
export function required(value: unknown, name: string, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new VendorError(400, `Enter a valid ${name}.`);
  return value.trim();
}
export function pageNumber(value: string | null) {
  const n = Number(value || 1);
  if (!Number.isSafeInteger(n) || n < 1 || n > 10000)
    throw new VendorError(400, "Invalid page.");
  return n;
}
