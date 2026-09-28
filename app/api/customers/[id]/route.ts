import { staffGuard } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await staffGuard(request, Permission.CUSTOMER_VIEW); if (denied) return denied;
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, isVerified: true, createdAt: true } },
      bookings: true,
      reviews: true,
      loyaltyAccount: true,
    },
  });

  if (!customer) {
    return NextResponse.json(
      {
        success: false,
        message: "Customer not found.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: customer,
  });
}