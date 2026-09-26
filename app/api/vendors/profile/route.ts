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

    const vendor = await prisma.vendor.findUnique({
      where: {
        id: vendorId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, mobile: true } },
        wallet: true,
        documents: true,
        pricingRules: true,
        reviews: true,
      },
    });

    if (!vendor) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error) { return vendorFailure(error); }
}
