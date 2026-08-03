import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        message: "Customer ID required.",
      },
      { status: 400 }
    );
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId: id,
    },
    include: {
      vendor: true,
      vehicle: true,
      driver: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    data: bookings,
  });
}