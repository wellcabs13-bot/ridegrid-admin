import { staffGuard } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const denied = await staffGuard(request, Permission.CUSTOMER_VIEW); if (denied) return denied;
  const search = request.nextUrl.searchParams.get("q") || "";

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, isVerified: true, createdAt: true } },
    },
  });

  return NextResponse.json({
    success: true,
    data: customers,
  });
}