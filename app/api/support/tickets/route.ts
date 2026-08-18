import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const headerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;
  return authenticate(headerToken ?? cookieToken);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await auth(request))) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      include: {
        customer: true,
        driver: true,
        vendor: true,
        corporate: true,
        assignedTo: true,
        messages: true,
        sla: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch tickets." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    if (!body.subject || !body.category || !body.priority || !body.source) {
      return NextResponse.json(
        { success: false, message: "subject, category, priority and source are required." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: body.customerId || undefined,
        driverId: body.driverId || undefined,
        vendorId: body.vendorId || undefined,
        corporateId: body.corporateId || undefined,
        bookingId: body.bookingId || undefined,
        category: body.category,
        priority: body.priority,
        source: body.source,
        status: body.status || "OPEN",
        subject: body.subject,
        description: body.description || undefined,
      },
      include: {
        customer: true,
        driver: true,
        vendor: true,
        corporate: true,
        sla: true,
      },
    });

    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create ticket." },
      { status: 500 }
    );
  }
}