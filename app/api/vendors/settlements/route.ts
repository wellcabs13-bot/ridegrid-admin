import { legacyVendorId } from "@/lib/vendor-mobile/legacy";
import { vendorFailure } from "@/lib/vendor-mobile/access";
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
  prisma,
} from "@/lib/prisma";

export async function GET(
  request: NextRequest
) {
  try {
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

    const result =
      await authorize(
        headerToken ?? cookieToken,
        [
          SecurityRole.SUPER_ADMIN,
          SecurityRole.OPERATIONS,
          SecurityRole.FINANCE,
          SecurityRole.VENDOR,
        ]
      );

    if (!result.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const vendorId = await legacyVendorId(request);

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vendor ID is required.",
        },
        { status: 400 }
      );
    }

    const settlements =
      await prisma.vendorSettlement.findMany({
        where: {
          vendorId,
        },
        include: {
          wallet: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    return NextResponse.json({
      success: true,
      data: settlements,
    });
  } catch (error) { return vendorFailure(error); }
}
