import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
import { customerRouteInput } from "@/lib/customer-route";
const select = { id: true, serviceType: true, tripType: true, pickupCity: true, dropCity: true, category: true, packageName: true, fareWatch: true, createdAt: true } as const;
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const routes = await prisma.customerSavedRoute.findMany({ where: { customer: { userId: a.user!.id, deletedAt: null } }, select, orderBy: { createdAt: "desc" }, take: 100 });
    return NextResponse.json({ success: true, data: { routes, automatedAlerts: false } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
export async function POST(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const raw = await request.json().catch(() => null);
    const input = customerRouteInput(raw);
    if (!input) return NextResponse.json({ success: false, message: "Choose a valid route and vehicle category." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { userId: a.user!.id, deletedAt: null }, select: { id: true } });
    if (!customer) return NextResponse.json({ success: false }, { status: 404 });
    const { fareWatch, ...route } = input;
    const data = await prisma.customerSavedRoute.upsert({ where: { customerId_serviceType_tripType_pickupCity_dropCity_category_packageName: { customerId: customer.id, ...route } }, create: { customerId: customer.id, ...input }, update: typeof raw.fareWatch === "boolean" ? { fareWatch } : {}, select });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
export async function DELETE(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || id.length > 100) return NextResponse.json({ success: false }, { status: 400 });
    const result = await prisma.customerSavedRoute.deleteMany({ where: { id, customer: { userId: a.user!.id, deletedAt: null } } });
    return NextResponse.json({ success: true, data: { deleted: result.count } });
  } catch { return mobileFailure(); }
}
