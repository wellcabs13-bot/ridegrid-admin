import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const access = await requestPermission(req, Permission.BOOKING_UPDATE); if (access.denied) return access.denied;
    const { bookingId } = await req.json();

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete booking.",
      },
      { status: 500 }
    );
  }
}
