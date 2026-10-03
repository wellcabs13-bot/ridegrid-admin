import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const account = await prisma.loyaltyAccount.findFirst({ where: { customer: { userId: a.user!.id, deletedAt: null } }, select: { totalPoints: true, transactions: { select: { id: true, points: true, transactionType: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 } } });
    return NextResponse.json({ success: true, data: { account, redemption: false } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
