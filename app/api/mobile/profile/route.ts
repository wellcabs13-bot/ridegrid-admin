import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
const select = { id: true, firstName: true, lastName: true, user: { select: { id: true, name: true, email: true, mobile: true, isVerified: true } } } as const;
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const data = await prisma.customer.findFirst({ where: { userId: a.user!.id, deletedAt: null }, select });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
export async function PATCH(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const b = await request.json();
    const firstName = typeof b.firstName === "string" ? b.firstName.trim() : "";
    const lastName = typeof b.lastName === "string" ? b.lastName.trim() : "";
    if (!firstName || !lastName || firstName.length > 100 || lastName.length > 100) return NextResponse.json({ success: false, message: "Enter your first and last name (up to 100 characters each)." }, { status: 400 });
    const customer = await prisma.customer.findFirst({ where: { userId: a.user!.id, deletedAt: null }, select: { id: true } });
    if (!customer) return NextResponse.json({ success: false }, { status: 404 });
    const data = await prisma.customer.update({ where: { id: customer.id }, data: { firstName, lastName, user: { update: { name: `${firstName} ${lastName}` } } }, select });
    return NextResponse.json({ success: true, data });
  } catch { return mobileFailure(); }
}
