import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

const PRIVILEGED_ROLES = ["SUPER_ADMIN", "OPERATIONS", "FINANCE"];

export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : request.cookies.get("ridegrid_access_token")?.value;

  const user = await authenticate(token);

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 }
    );
  }

  const requestedId = request.nextUrl.searchParams.get("id");
  const isPrivileged = PRIVILEGED_ROLES.includes(user.role);

  let customerId: string;

  if (isPrivileged && requestedId) {
    customerId = requestedId;
  } else {
    const customer = await prisma.customer.findFirst({
      where: { userId: user.id },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer profile not found." },
        { status: 404 }
      );
    }

    customerId = customer.id;
  }

  const bookings = await prisma.booking.findMany({
    where: {
      customerId,
    },
    include: {
      vendor: true,
      vehicle: true,
      driver: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    success: true,
    data: bookings,
  });
}
