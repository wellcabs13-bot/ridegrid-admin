import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requestUser } from "@/lib/request-access";
import { AccountLifecycleError } from "@/lib/services/admin/AccountLifecycleService";
import { BookingAdminError } from "@/lib/services/admin/BookingAdminService";

// Shared guard + response helpers for /api/admin/* routes. Global (cross-tenant)
// data is only for platform staff; tenant roles keep using their own scoped APIs.
export const SUPER_ADMIN_ONLY: UserRole[] = ["SUPER_ADMIN"];
export const OPERATIONS_STAFF: UserRole[] = ["SUPER_ADMIN", "OPERATIONS"];
export const FINANCE_STAFF: UserRole[] = ["SUPER_ADMIN", "FINANCE"];
export const ALL_STAFF: UserRole[] = ["SUPER_ADMIN", "OPERATIONS", "FINANCE"];

export class AdminApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function staffAccess(request: NextRequest, roles: UserRole[]) {
  const user = await requestUser(request);
  if (!user) return { user: null, denied: NextResponse.json({ success: false, message: "Please sign in to continue." }, { status: 401 }) };
  if (!roles.includes(user.role)) return { user: null, denied: NextResponse.json({ success: false, message: "You do not have access to this administration area." }, { status: 403 }) };
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")
      return { user: null, denied: NextResponse.json({ success: false, message: "Cross-site changes are not allowed." }, { status: 403 }) };
  }
  return { user, denied: null };
}

export function ok(data: unknown) {
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
}

export function fail(error: unknown, context: string) {
  if (error instanceof AdminApiError || error instanceof BookingAdminError || error instanceof AccountLifecycleError)
    return NextResponse.json({ success: false, message: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code === "P2002") return NextResponse.json({ success: false, message: "A record with these details already exists." }, { status: 409 });
  if (code === "P2034") return NextResponse.json({ success: false, message: "This record changed. Refresh and retry." }, { status: 409 });
  console.error(`${context} failed`, error);
  return NextResponse.json({ success: false, message: "Unable to complete the request. Please retry." }, { status: 500 });
}

export function str(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function intParam(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
