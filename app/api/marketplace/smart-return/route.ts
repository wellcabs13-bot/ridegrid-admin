import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const pickup = req.nextUrl.searchParams.get("pickup")?.trim();
    const drop = req.nextUrl.searchParams.get("drop")?.trim();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "20")));

    const where = {
      status: "PUBLISHED" as const,
      ...(pickup ? { pickupLocation: { contains: pickup, mode: "insensitive" as const } } : {}),
      ...(drop ? { dropLocation: { contains: drop, mode: "insensitive" as const } } : {}),
    };

    const [listings, total] = await Promise.all([
      prisma.smartReturnListing.findMany({
        where,
        include: {
          vehicle: true,
          vendor: true,
        },
        orderBy: [
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.smartReturnListing.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        listings: listings.map((listing) => ({
          id: listing.id,
          type: "SMART_RETURN",
          status: listing.status,
          pickupLocation: listing.pickupLocation,
          dropLocation: listing.dropLocation,
          fare: Number(listing.fare),
          baseFare: Number(listing.baseFare),
          discountPercent: Number(listing.discountPercent),
          publishedAt: listing.publishedAt,
          expiresAt: listing.expiresAt,
          vehicle: {
            id: listing.vehicle.id,
            make: listing.vehicle.make,
            model: listing.vehicle.model,
            category: listing.vehicle.category,
            seatingCapacity: listing.vehicle.seatingCapacity,
            rating: listing.vehicle.rating,
          },
          vendor: {
            id: listing.vendor.id,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/marketplace/smart-return error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Smart Return marketplace search failed.",
      },
      { status: 500 }
    );
  }
}