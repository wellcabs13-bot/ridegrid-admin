import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  SecurityRole,
} from "@/types/security";

import {
  authorize,
} from "@/lib/auth/middleware";

import {
  financeService,
} from "@/lib/services/finance/FinanceService";

async function getUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  const headerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

  const cookieToken =
    request.cookies.get(
      "ridegrid_access_token"
    )?.value ??
    request.cookies.get(
      "ridegrid-token"
    )?.value;

  return authorize(
    headerToken ?? cookieToken,
    [
      SecurityRole.SUPER_ADMIN,
      SecurityRole.OPERATIONS,
      SecurityRole.FINANCE,
      SecurityRole.VENDOR,
    ]
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const result =
      await getUser(request);

    if (!result.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const vendorId =
      request.nextUrl.searchParams.get(
        "vendorId"
      );

    if (
      result.user?.role ===
        SecurityRole.VENDOR &&
      !vendorId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    const data = vendorId
      ? await financeService.getVendorSettlements(
          vendorId
        )
      : await financeService.getSettlements();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/finance/settlements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch settlements.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const result =
      await getUser(request);

    if (
      !result.authorized ||
      ![
        SecurityRole.SUPER_ADMIN,
        SecurityRole.FINANCE,
        SecurityRole.OPERATIONS,
      ].includes(
        result.user!.role
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body =
      await request.json();

    const settlement =
      await financeService.createSettlement(
        body
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Settlement created successfully.",
        data: settlement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/finance/settlements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create settlement.",
      },
      { status: 500 }
    );
  }
}
