import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        user: true,
        bookings: {
          include: {
            vehicle: true,
            driver: {
              include: {
                user: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = customers.map((customer) => {
      const totalBookings = customer.bookings.length;

      const totalSpent = customer.bookings.reduce(
        (sum, booking) => {
          const amount =
            booking.finalFare ??
            booking.estimatedFare ??
            0;

          return sum + Number(amount);
        },
        0
      );

      const latestBooking = customer.bookings[0];

      const preferredVehicle =
        latestBooking?.vehicle?.model ??
        "-";

      const preferredDriver =
        latestBooking?.driver?.user?.name ??
        "-";

      return {
        id: customer.id,
        name:
          `${customer.firstName} ${customer.lastName}`.trim() ||
          customer.user.name,
        mobile: customer.user.mobile ?? "",
        email: customer.user.email,

        // Customer model currently has no city field.
        city: "-",

        totalBookings,

        totalSpent: `₹${totalSpent.toLocaleString(
          "en-IN"
        )}`,

        preferredVehicle,
        preferredDriver,

        status: customer.user.isActive
          ? "Active"
          : "Inactive",

        joinedDate:
          customer.createdAt.toLocaleDateString(),
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch customers.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();

    const nameParts = name.split(/\s+/);

    const firstName =
      String(
        body.firstName ??
          nameParts.shift() ??
          ""
      ).trim();

    const lastName =
      String(
        body.lastName ??
          nameParts.join(" ")
      ).trim();

    if (!firstName) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer email is required.",
        },
        {
          status: 400,
        }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        user: {
          create: {
            name:
              `${firstName} ${lastName}`.trim(),
            email: body.email,
            mobile: body.mobile ?? null,
            password: "",
            role: "CUSTOMER",
          },
        },
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (error) {
    console.error(
      "POST /api/customers error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create customer.",
      },
      {
        status: 500,
      }
    );
  }
}