import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serializeDecimal(value: unknown) {
  return value == null ? null : Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vendorId = searchParams.get("vendorId")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        status: "ACTIVE",
        validFrom: { lte: now },
        validTo: { gte: now },
        OR: [
          { usageLimit: null },
          { usageLimit: { gt: 0 }, },
        ],
        AND: [
          {
            OR: [
              { couponScope: "GLOBAL" },
              ...(vendorId
                ? [
                    {
                      couponScope: "VENDOR" as const,
                      vendorOffers: {
                        some: {
                          vendorId,
                          isActive: true,
                          startDate: { lte: now },
                          endDate: { gte: now },
                        },
                      },
                    },
                  ]
                : []),
              ...(city
                ? [
                    {
                      couponScope: "CITY" as const,
                      geoOffers: {
                        some: {
                          city: { equals: city, mode: "insensitive" as const },
                          isActive: true,
                          startDate: { lte: now },
                          endDate: { gte: now },
                        },
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        couponType: true,
        couponScope: true,
        discountValue: true,
        minimumBooking: true,
        maximumDiscount: true,
        usageLimit: true,
        usedCount: true,
        validFrom: true,
        validTo: true,
        isFirstRideOnly: true,
      },
    });

    const eligible = coupons.filter(
      (coupon) =>
        coupon.usageLimit == null || coupon.usedCount < coupon.usageLimit
    );

    return NextResponse.json({
      success: true,
      data: eligible.map((coupon) => ({
        ...coupon,
        discountValue: Number(coupon.discountValue),
        minimumBooking: serializeDecimal(coupon.minimumBooking),
        maximumDiscount: serializeDecimal(coupon.maximumDiscount),
      })),
      count: eligible.length,
    });
  } catch (error) {
    console.error("GET /api/marketplace/coupons:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load current offers.",
      },
      { status: 500 }
    );
  }
}
