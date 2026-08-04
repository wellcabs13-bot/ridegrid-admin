import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = customers.map((customer) => ({
      id: customer.id,
      name: customer.user.name,
      mobile: customer.user.mobile,
      email: customer.user.email,
      city: customer.city,
      totalBookings: customer.totalBookings,
      totalSpent: `₹${Number(customer.totalSpent).toLocaleString("en-IN")}`,
      preferredVehicle: customer.preferredVehicle ?? "-",
      preferredDriver: customer.preferredDriver ?? "-",
      status: customer.isActive ? "Active" : "Inactive",
      joinedDate: customer.createdAt.toLocaleDateString(),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const customer = await prisma.customer.create({
      data: {
        city: body.city,
        user: {
          create: {
            name: body.name,
            email: body.email,
            mobile: body.mobile,
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
    console.error(error);

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