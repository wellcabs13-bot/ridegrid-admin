import { NextRequest, NextResponse } from "next/server";

import { authService } from "@/lib/auth/auth";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const refreshToken =
      typeof body.refreshToken === "string" &&
      body.refreshToken
        ? body.refreshToken
        : request.cookies.get(
            "ridegrid_refresh_token"
          )?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await authService.refresh(refreshToken);

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    response.cookies.set(
      "ridegrid_access_token",
      result.accessToken,
      {
        ...cookieOptions,
        maxAge: 60 * 60,
      }
    );

    response.cookies.set(
      "ridegrid_refresh_token",
      result.refreshToken,
      {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30,
      }
    );

    return response;
  } catch (error) {
    console.error("POST /api/auth/refresh", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Invalid refresh token.",
      },
      { status: 401 }
    );
  }
}
