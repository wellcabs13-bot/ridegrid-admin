import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const headerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;
  return authenticate(headerToken ?? cookieToken);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await auth(request))) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;

    const data = await prisma.ticketEscalation.findMany({
      where: { ticketId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch escalations." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await auth(request))) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.escalatedTo) {
      return NextResponse.json(
        { success: false, message: "escalatedTo is required." },
        { status: 400 }
      );
    }

    const data = await prisma.ticketEscalation.create({
      data: {
        ticketId: id,
        escalatedTo: body.escalatedTo,
        reason: body.reason || undefined,
        escalatedAt: body.escalatedAt ? new Date(body.escalatedAt) : new Date(),
      },
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { priority: "HIGH", status: "ASSIGNED" },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to escalate ticket." },
      { status: 500 }
    );
  }
}