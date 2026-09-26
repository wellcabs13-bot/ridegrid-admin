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

    const drivers = await prisma.driver.findMany({
      where: {
        deletedAt: null,
        vehicles: {
          some: {
            vendorId,
          },
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, mobile: true } },
        vehicles: { where: { vendorId, deletedAt: null } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: drivers,
    });
  } catch (error) { return vendorFailure(error); }
}
