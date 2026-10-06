import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { bookingView, bookingViewSelect } from "@/lib/services/booking/BookingContactPolicy";

const PRIVILEGED_ROLES = ["SUPER_ADMIN", "OPERATIONS", "FINANCE"];

// A customer's bookings. Uses the same role-aware fields as GET /api/bookings/[id]
// (BookingContactPolicy): never vendor bank details, driver identity documents,
// payout/commission splits or gateway data.
export async function GET(request: NextRequest) {
  const user = await requestUser(request);

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
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
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
      deletedAt: null,
    },
    select: bookingViewSelect,
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  return NextResponse.json({
    success: true,
    data: bookings.map((b) => bookingView(b, user)),
  });
}
