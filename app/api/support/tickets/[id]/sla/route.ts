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

    const sla = await prisma.ticketSLA.findUnique({
      where: { ticketId: id },
    });

    return NextResponse.json({ success: true, data: sla });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch SLA." },
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

    if (!body.responseDueAt || !body.resolutionDueAt) {
      return NextResponse.json(
        { success: false, message: "responseDueAt and resolutionDueAt are required." },
        { status: 400 }
      );
    }

    const sla = await prisma.ticketSLA.upsert({
      where: { ticketId: id },
      create: {
        ticketId: id,
        responseDueAt: new Date(body.responseDueAt),
        resolutionDueAt: new Date(body.resolutionDueAt),
        status: body.status || "ON_TIME",
      },
      update: {
        responseDueAt: new Date(body.responseDueAt),
        resolutionDueAt: new Date(body.resolutionDueAt),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.breachedAt !== undefined && {
          breachedAt: body.breachedAt ? new Date(body.breachedAt) : null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: sla }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to create/update SLA." },
      { status: 500 }
    );
  }
}