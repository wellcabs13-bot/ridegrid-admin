import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function serializeVendor(vendor: any) {
  return {
    id: vendor.id,
    companyName: vendor.companyName,
    ownerName: vendor.user?.name ?? "",
    mobile: vendor.user?.mobile ?? "",
    email: vendor.user?.email ?? "",
    city: "",
    totalVehicles: vendor.vehicles?.length ?? 0,
    activeVehicles:
      vendor.vehicles?.filter(
        (vehicle: any) => vehicle.status === "AVAILABLE"
      ).length ?? 0,
    completedTrips:
      vendor.bookings?.filter(
        (booking: any) => booking.status === "COMPLETED"
      ).length ?? 0,
    totalEarnings: "₹0",
    pendingPayment: "₹0",
    rating: 0,
    status: vendor.isApproved ? "Active" : "Pending",
    joinedDate: new Date(vendor.createdAt).toLocaleDateString("en-IN"),
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";

    const vendors = await prisma.vendor.findMany({
      where: {
        deletedAt: null,

        ...(status === "Active"
          ? { isApproved: true }
          : status === "Pending"
            ? { isApproved: false }
            : {}),

        ...(search
          ? {
              OR: [
                {
                  companyName: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  user: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    email: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  user: {
                    mobile: {
                      contains: search,
                    },
                  },
                },
              ],
            }
          : {}),
      },

      include: {
        user: true,

        vehicles: {
          where: {
            deletedAt: null,
          },
        },

        bookings: {
          where: {
            deletedAt: null,
          },
          select: {
            status: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: vendors.map(serializeVendor),
    });
  } catch (error) {
    console.error("GET /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load vendors.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      companyName,
      ownerName,
      mobile,
      email,
    } = body;

    if (
      !companyName?.trim() ||
      !ownerName?.trim() ||
      !mobile?.trim() ||
      !email?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Company, owner, mobile and email are required.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          {
            email: normalizedEmail,
          },
          {
            mobile: normalizedMobile,
          },
        ],
        deletedAt: null,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingUser.email === normalizedEmail
              ? "A user with this email already exists."
              : "A user with this mobile number already exists.",
        },
        { status: 409 }
      );
    }

    const temporaryPassword = crypto.randomUUID();

    const hashedPassword = await bcrypt.hash(
      temporaryPassword,
      12
    );

    const vendor = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: ownerName.trim(),
          email: normalizedEmail,
          mobile: normalizedMobile,
          password: hashedPassword,
          role: "VENDOR",
          isActive: true,
          isVerified: false,
        },
      });

      return tx.vendor.create({
        data: {
          userId: user.id,
          companyName: companyName.trim(),
          isApproved: false,
        },
        include: {
          user: true,
          vehicles: {
            where: {
              deletedAt: null,
            },
          },
          bookings: {
            where: {
              deletedAt: null,
            },
            select: {
              status: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Vendor created successfully.",
        data: serializeVendor(vendor),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create vendor.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      id,
      companyName,
      ownerName,
      mobile,
      email,
      status,
    } = body;

    if (!id) {
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
        id,
      },
      include: {
        user: true,
      },
    });

    if (!vendor || vendor.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor not found.",
        },
        { status: 404 }
      );
    }

    const updatedVendor = await prisma.$transaction(async (tx: any) => {
        await tx.user.update({
          where: {
            id: vendor.userId,
          },
          data: {
            ...(ownerName !== undefined
              ? { name: ownerName }
              : {}),

            ...(mobile !== undefined
              ? { mobile }
              : {}),

            ...(email !== undefined
              ? { email }
              : {}),
          },
        });

        return tx.vendor.update({
          where: {
            id,
          },

          data: {
            ...(companyName !== undefined
              ? { companyName }
              : {}),

            ...(status !== undefined
              ? {
                  isApproved: status === "Active",
                }
              : {}),
          },

          include: {
            user: true,

            vehicles: {
              where: {
                deletedAt: null,
              },
            },

            bookings: {
              where: {
                deletedAt: null,
              },
              select: {
                status: true,
              },
            },
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      message:
        status === "Active"
          ? "Vendor activated successfully."
          : "Vendor updated successfully.",
      data: serializeVendor(updatedVendor),
    });
  } catch (error) {
    console.error("PUT /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update vendor.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");

    if (!id) {
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
        id,
      },
    });

    if (!vendor || vendor.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor not found.",
        },
        { status: 404 }
      );
    }

    await prisma.vendor.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE /api/vendors failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete vendor.",
      },
      { status: 500 }
    );
  }
}