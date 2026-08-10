import { NextRequest, NextResponse } from "next/server";

import { authService } from "@/lib/auth/auth";
import { apiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const refreshToken =
      typeof body.refreshToken === "string"
        ? body.refreshToken
        : "";

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Refresh token is required.",
        },
        {
          status: 400,
        }
      );
    }

    const authorization =
      request.headers.get("authorization");

    const accessToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : request.cookies.get("ridegrid-token")?.value ?? "";

    const session = {
      sessionId:
        body.sessionId ??
        crypto.randomUUID(),

      accessToken,

      refreshToken,

      expiresAt:
        body.expiresAt
          ? new Date(body.expiresAt)
          : new Date(),

      ipAddress:
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown",

      device:
        request.headers.get("sec-ch-ua") ??
        "unknown",

      browser:
        request.headers.get("user-agent") ??
        "unknown",
    };

    await authService.logout(session);

    const response = NextResponse.json({
      success: true,
      message: "Logout successful.",
    });

    response.cookies.delete("ridegrid-token");

    return response;
  } catch (error) {
    return apiError(error);
  }
}