import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { penaltyService } from "@/lib/services/penalty/PenaltyService";

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
    const user = await auth(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

    const vendorId = request.nextUrl.searchParams.get("vendorId") ?? undefined;
    const driverId = request.nextUrl.searchParams.get("driverId") ?? undefined;

    if (vendorId) return NextResponse.json({ success: true, data: await penaltyService.getVendorPenaltyReport(vendorId) });
    return NextResponse.json({ success: true, data: await penaltyService.listDriverPenalties(driverId) });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to fetch penalties." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

    const body = await request.json();

    if (body.vendorId) {
      const data = await penaltyService.createVendorPenalty({
        vendorId: body.vendorId,
        penaltyType: body.penaltyType,
        amount: Number(body.amount),
        reason: body.reason,
        performedBy: user.id,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    if (body.driverId) {
      const data = await penaltyService.createDriverPenalty({
        driverId: body.driverId,
        penaltyType: body.penaltyType,
        amount: Number(body.amount),
        reason: body.reason,
      });
      return NextResponse.json({ success: true, data }, { status: 201 });
    }

    return NextResponse.json({ success: false, message: "Vendor ID or Driver ID is required." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Failed to create penalty." }, { status: 500 });
  }
}
