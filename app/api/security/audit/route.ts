import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  auditLogger,
} from "@/lib/security/audit-log";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("userId");

    const entityModule =
      searchParams.get("module");

    const requestedLimit =
      Number(
        searchParams.get("limit") ?? "100"
      );

    const limit = Math.min(
      Math.max(
        Number.isFinite(
          requestedLimit
        )
          ? requestedLimit
          : 100,
        1
      ),
      500
    );

    let data;

    if (userId) {
      data =
        await auditLogger.getByUser(
          userId,
          limit
        );
    } else if (entityModule) {
      data =
        await auditLogger.getByModule(
          entityModule,
          limit
        );
    } else {
      data =
        await auditLogger.getAll(
          limit
        );
    }

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error(
      "GET /api/security/audit",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch audit logs.",
      },
      {
        status: 500,
      }
    );
  }
}