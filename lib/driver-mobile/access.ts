import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";

export class DriverError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function driverAccess(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) throw new DriverError(401, "Please sign in.");
  if (user.role !== "DRIVER") throw new DriverError(403, "A Driver account is required.");
  const origin = request.headers.get("origin");
  if (!["GET", "HEAD"].includes(request.method) && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site"))
    throw new DriverError(403, "Cross-site changes are not allowed.");
  const driver = await prisma.driver.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true, status: true } });
  if (!driver || driver.status !== "ACTIVE") throw new DriverError(403, "Your Driver profile is unavailable or inactive. Contact Operations.");
  // Legacy clients must not use an ID to select a different account.
  if ((request.nextUrl.searchParams.has("driverId") && request.nextUrl.searchParams.get("driverId") !== driver.id) ||
      (request.nextUrl.searchParams.has("userId") && request.nextUrl.searchParams.get("userId") !== user.id))
    throw new DriverError(403, "Account access denied.");
  return { user, driverId: driver.id };
}
export type DriverAccess = Awaited<ReturnType<typeof driverAccess>>;
export const ok = (data: unknown) => NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
export function failure(e: unknown) {
  const conflict = e && typeof e === "object" && "code" in e && ["P2034", "P2002"].includes(String(e.code));
  return NextResponse.json({ success: false, message: e instanceof DriverError ? e.message : conflict ? "Assignment changed. Refresh and retry." : e instanceof SyntaxError ? "Invalid request." : "Unable to complete the request. Please retry." }, { status: e instanceof DriverError ? e.status : conflict ? 409 : e instanceof SyntaxError ? 400 : 500 });
}
export function required(value: unknown, name: string, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new DriverError(400, `Invalid ${name}.`);
  return value.trim();
}
