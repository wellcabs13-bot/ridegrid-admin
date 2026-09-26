import {
  NextRequest,
  NextResponse,
} from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";
import { authenticate } from "@/lib/auth/middleware";
import { SecurityRole } from "@/types/security";

function getToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  const headerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

  return (
    headerToken ??
    request.cookies.get(
      "ridegrid_access_token"
    )?.value ??
    request.cookies.get(
      "ridegrid-token"
    )?.value
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await authenticate(getToken(request));

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const allowedRoles = [
      SecurityRole.SUPER_ADMIN,
      SecurityRole.FINANCE,
      SecurityRole.OPERATIONS,
    ];

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden.",
        },
        { status: 403 }
      );
    }

    const vendorId =
      new URL(request.url)
        .searchParams
        .get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "vendorId is required.",
        },
        { status: 400 }
      );
    }

    const wallet =
      await financeService.getVendorWallet(
        vendorId
      );

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor wallet not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    console.error(
      "GET /api/finance/wallet:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch wallet.",
      },
      { status: 500 }
    );
  }
}
