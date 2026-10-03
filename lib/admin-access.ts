import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

// Global administrative data follows the existing /api/admin access boundary.
// Tenant-facing APIs retain their own ownership and authorization checks.
export async function requireAdmin(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : request.cookies.get("ridegrid_access_token")?.value;
  const claims = await authenticate(token);
  if (!claims?.id) return NextResponse.json({ success: false, message: "Please sign in to continue." }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: claims.id },
    select: { role: true, isActive: true, deletedAt: true },
  });
  if (!user?.isActive || user.deletedAt) return NextResponse.json({ success: false, message: "Session is no longer valid." }, { status: 401 });
  if (user.role !== "SUPER_ADMIN") return NextResponse.json({ success: false, message: "Superadmin access is required for global administration." }, { status: 403 });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return NextResponse.json({ success: false, message: "Cross-site changes are not allowed." }, { status: 403 });
    }
  }
  return null;
}
