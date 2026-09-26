import { NextRequest, NextResponse } from "next/server";
import { Prisma, UserRole } from "@prisma/client";
import { authenticate } from "@/lib/auth/middleware";
import { hasPermission, Permission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function requestUser(request: NextRequest) {
  const header = request.headers.get("authorization");
  const claims = await authenticate(header?.startsWith("Bearer ") ? header.slice(7) : request.cookies.get("ridegrid_access_token")?.value);
  if (!claims?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { id: true, name: true, role: true, isActive: true, deletedAt: true },
  });
  return user?.isActive && !user.deletedAt ? user : null;
}

export async function requestPermission(request: NextRequest, permission: Permission) {
  const user = await requestUser(request);
  if (!user) return { user: null, denied: NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 }) };
  if (!hasPermission(user.role, permission)) return { user: null, denied: NextResponse.json({ success: false, message: "Access denied." }, { status: 403 }) };
  const origin = request.headers.get("origin");
  if (!["GET","HEAD","OPTIONS"].includes(request.method) && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")) {
    return { user: null, denied: NextResponse.json({ success: false, message: "Cross-site changes are not allowed." }, { status: 403 }) };
  }
  return { user, denied: null };
}

export function bookingScope(user: { id: string; role: UserRole }): Prisma.BookingWhereInput {
  if (user.role === "SUPER_ADMIN" || user.role === "OPERATIONS" || user.role === "FINANCE") return {};
  if (user.role === "CUSTOMER") return { customer: { userId: user.id } };
  if (user.role === "VENDOR") return { vendor: { userId: user.id } };
  if (user.role === "DRIVER") return { driver: { userId: user.id } };
  if (user.role === "CORPORATE_ADMIN" || user.role === "CORPORATE_EMPLOYEE") {
    return { corporate: { employees: { some: { userId: user.id, isActive: true } } } };
  }
  return { id: { in: [] } };
}
