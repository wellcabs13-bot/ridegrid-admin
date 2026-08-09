import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function serializeDriver(driver: any) {
  const vehicle = driver.vehicles?.[0] ?? null;

  return {
    id: driver.id,
    name: `${driver.firstName} ${driver.lastName}`.trim(),
    photo: "",
    mobile: driver.user?.mobile ?? "",
    email: driver.user?.email ?? "",
    licenseNumber: driver.licenseNumber,
    licenseExpiry: "",
    aadhaar: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    joinDate: driver.createdAt.toISOString(),
    experience: "",
    vehicle: vehicle?.vehicleType ?? vehicle?.model ?? "",
    vehicleNumber: vehicle?.registrationNumber ?? "",
    trips: driver.bookings?.length ?? 0,
    rating: 0,
    earnings: driver.bookings?.reduce(
      (sum: number, booking: any) =>
        sum + Number(booking.driverPayout ?? 0),
      0
    ) ?? 0,
    wallet: 0,
    availability: "Available" as const,
    status: driver.deletedAt
      ? ("Inactive" as const)
      : ("Active" as const),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const page = Math.max(
      Number(searchParams.get("page") ?? "1"),
      1
    );
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? "50"), 1),
      100
    );

    const where: any = {
      ...(status === "Inactive"
        ? { deletedAt: { not: null } }
        : { deletedAt: null }),
    };

    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          licenseNumber: {
            contains: search,
            mode: "insensitive",
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
      ];
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: true,
          vehicles: true,
          bookings: {
            select: {
              driverPayout: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.driver.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: drivers.map(serializeDriver),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/drivers", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load drivers.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const mobile = String(body.mobile ?? "").trim();
    const licenseNumber = String(
      body.licenseNumber ?? ""
    ).trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !licenseNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "First name, last name, email and license number are required.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    const existingLicense =
      await prisma.driver.findUnique({
        where: { licenseNumber },
      });

    if (existingLicense) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A driver with this license number already exists.",
        },
        { status: 409 }
      );
    }

    const driver = await prisma.driver.create({
      data: {
        firstName,
        lastName,
        licenseNumber,
        user: {
          create: {
            name: `${firstName} ${lastName}`.trim(),
            email,
            mobile: mobile || null,
            password: String(
              body.password ?? "ChangeMe@123"
            ),
            role: UserRole.DRIVER,
          },
        },
      },
      include: {
        user: true,
        vehicles: true,
        bookings: {
          select: {
            driverPayout: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: serializeDriver(driver),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/drivers", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create driver.",
      },
      { status: 500 }
    );
  }
}