import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const raw = Number(request.nextUrl.searchParams.get("page") || 1);
    const page = Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, 10000) : 1;
    const where = { userId: a.user!.id };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, skip: (page - 1) * 30, select: { id: true, title: true, message: true, readAt: true, createdAt: true } }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return NextResponse.json({ success: true, data: { items, unread, page, hasMore: items.length === 30 } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
export async function PATCH(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const { id } = await request.json();
    if (typeof id !== "string" || !id) return NextResponse.json({ success: false }, { status: 400 });
    // readAt is separate from delivery sentAt; scope the write atomically.
    const result = await prisma.notification.updateMany({ where: { id, userId: a.user!.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ success: true, data: { updated: result.count } });
  } catch { return mobileFailure(); }
}
