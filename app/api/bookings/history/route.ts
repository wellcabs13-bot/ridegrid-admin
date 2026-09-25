import { requestPermission, bookingScope } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const access = await requestPermission(req, Permission.BOOKING_VIEW); if (access.denied) return access.denied;
    const bookingId = req.nextUrl.searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "bookingId is required.",
        },
        { status: 400 }
      );
    }

    const history = await prisma.bookingStatusHistory.findMany({
      where: {
        bookingId, booking: { deletedAt: null, ...bookingScope(access.user!) },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch booking history.",
      },
      { status: 500 }
    );
  }
}
