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

  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
      bookings: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: customer,
  });
}