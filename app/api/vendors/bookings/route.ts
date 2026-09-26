import { legacyVendorId } from "@/lib/vendor-mobile/legacy";
import { vendorFailure } from "@/lib/vendor-mobile/access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vendorId = await legacyVendorId(req);

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        vendorId,
        deletedAt: null,
      },
      include: {
        customer: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        driver: {
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
          },
        },
        vehicle: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) { return vendorFailure(error); }
}
