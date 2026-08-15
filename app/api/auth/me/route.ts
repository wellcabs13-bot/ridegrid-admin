  import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@/lib/auth/middleware";

export async function GET(request: NextRequest) {
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
      )?.value;

    const token =
      headerToken ?? cookieToken;

    const user = await authenticate(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(
      "GET /api/auth/me",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to validate session.",
      },
      { status: 401 }
    );
  }
}