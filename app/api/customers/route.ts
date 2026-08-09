import { NextRequest, NextResponse } from "next/server";
import { customerRepository } from "@/lib/repositories/customer";

function serializeCustomer(customer: any) {
  const bookings = customer.bookings ?? [];

  const totalBookings = bookings.length;

  const totalSpent = bookings.reduce(
    (sum: number, booking: any) => {
      const amount =
        booking.finalFare ??
        booking.estimatedFare ??
        0;

      return sum + Number(amount);
    },
    0
  );

  const latestBooking = bookings[0];

  const preferredVehicle =
    latestBooking?.vehicle
      ? `${latestBooking.vehicle.registrationNumber} (${latestBooking.vehicle.category})`
      : "—";

  const preferredDriver =
    latestBooking?.driver
      ? `${latestBooking.driver.firstName} ${latestBooking.driver.lastName}`
      : "—";

  return {
    id: customer.id,
    name:
      customer.user?.name ||
      `${customer.firstName} ${customer.lastName}`.trim(),
    mobile: customer.user?.mobile || "—",
    email: customer.user?.email || "—",
    city: "—",
    status: customer.user?.isActive
      ? "Active"
      : "Inactive",
    totalBookings,
    totalSpent: `₹${totalSpent.toLocaleString("en-IN")}`,
    preferredVehicle,
    preferredDriver,
    joinedOn: customer.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;

    const search =
      searchParams.get("search")?.trim().toLowerCase() || "";

    const status =
      searchParams.get("status") || "";

    const result = await customerRepository.findAll();

    const customers = result.customers;

    let data = customers.map(serializeCustomer);

    if (search) {
      data = data.filter(
        (customer) =>
          customer.name.toLowerCase().includes(search) ||
          customer.email.toLowerCase().includes(search) ||
          customer.mobile.toLowerCase().includes(search)
      );
    }

    if (status) {
      data = data.filter(
        (customer) => customer.status === status
      );
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: data.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/customers",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to load customers.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const mobile =
      typeof body.mobile === "string"
        ? body.mobile.trim()
        : null;

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!firstName || !lastName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "First name and last name are required.",
        },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          message: "Password is required.",
        },
        { status: 400 }
      );
    }

    const validation =
      passwordServiceValidation(password);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.errors.join(" "),
        },
        { status: 400 }
      );
    }

    const customer =
      await customerRepository.create({
        firstName,
        lastName,
        email,
        mobile,
        password,
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "Customer created successfully.",
        data: {
          id: customer.id,
          name: customer.user.name,
          email: customer.user.email,
          mobile: customer.user.mobile,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error(
      "POST /api/customers",
      error
    );

    if (
      error?.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A customer with this email or mobile already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to create customer.",
      },
      { status: 500 }
    );
  }
}

function passwordServiceValidation(
  password: string
) {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push(
      "Minimum 8 characters required."
    );
  }

  if (!/[A-Z]/.test(password)) {
    errors.push(
      "At least one uppercase letter required."
    );
  }

  if (!/[a-z]/.test(password)) {
    errors.push(
      "At least one lowercase letter required."
    );
  }

  if (!/[0-9]/.test(password)) {
    errors.push(
      "At least one number required."
    );
  }

  if (
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    errors.push(
      "At least one special character required."
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


