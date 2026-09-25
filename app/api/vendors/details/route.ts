import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const vendorId = request.nextUrl.searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        { success: false, message: "vendorId is required." },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: { select: { name: true, mobile: true, email: true } },

        vehicles: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            make: true,
            model: true,
            variant: true,
            registrationNumber: true,
            category: true,
            status: true,
            rating: true,
            totalTrips: true,
            isVerified: true,
          },
        },

        bookings: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            vendorEarning: true,
            estimatedFare: true,
            finalFare: true,
            createdAt: true,
          },
        },

        documents: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            fileUrl: true,
            status: true,
            createdAt: true,
            expiryDate: true,
          },
        },

        settlements: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            commission: true,
            netAmount: true,
            settlementStatus: true,
            settlementReference: true,
            bankReference: true,
            createdAt: true,
            settledAt: true,
          },
        },

        reviews: {
          where: { status: "PUBLISHED" },
          select: {
            rating: true,
          },
        },
      },
    });

    if (!vendor || vendor.deletedAt) {
      return NextResponse.json(
        { success: false, message: "Vendor not found." },
        { status: 404 }
      );
    }

    const completedBookings = vendor.bookings.filter(
      (booking) => booking.status === "TRIP_COMPLETED"
    );

    const totalEarned = completedBookings.reduce(
      (sum, booking) =>
        sum + Number(booking.vendorEarning ?? 0),
      0
    );

    const settlementTotal = await prisma.vendorSettlement.aggregate({
      where: { vendorId, settlementStatus: "COMPLETED" },
      _sum: { netAmount: true },
    });
    const totalSettled = Number(settlementTotal._sum.netAmount ?? 0);

    const pendingPayment = Math.max(totalEarned - totalSettled, 0);

    const averageRating =
      vendor.reviews.length > 0
        ? vendor.reviews.reduce((sum, review) => sum + review.rating, 0) /
          vendor.reviews.length
        : 0;

    const activeVehicles = vendor.vehicles.filter(
      (vehicle) => vehicle.status === "AVAILABLE"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          companyName: vendor.companyName,
          ownerName: vendor.user?.name ?? "",
          mobile: vendor.user?.mobile ?? "",
          email: vendor.user?.email ?? "",
          homeCity: vendor.homeCity ?? "",
          fleetSize: vendor.fleetSize,
          address: vendor.address ?? "",
          city: vendor.city ?? "",
          state: vendor.state ?? "",
          pinCode: vendor.pinCode ?? "",
          bankName: vendor.bankName ?? "",
          accountNumber: vendor.accountNumber ?? "",
          ifscCode: vendor.ifscCode ?? "",
          branchName: vendor.branchName ?? "",
          status: vendor.isApproved ? "Active" : "Pending",
          joinedDate: vendor.createdAt,
        },

        vehicles: vendor.vehicles,

        payments: {
          totalEarned,
          totalSettled,
          pendingPayment,
          settlements: vendor.settlements,
        },

        documents: vendor.documents,

        performance: {
          totalVehicles: vendor.vehicles.length,
          activeVehicles,
          completedTrips: completedBookings.length,
          totalBookings: vendor.bookings.length,
          rating: Number(averageRating.toFixed(2)),
          totalReviews: vendor.reviews.length,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/vendors/details failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load vendor details.",
      },
      { status: 500 }
    );
  }
}
