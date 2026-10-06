import { NextRequest, NextResponse } from "next/server";

import { authService } from "@/lib/auth/auth";
import { apiError } from "@/lib/api-error";
import { refreshTokenService } from "@/lib/auth/refresh-token";
import { deactivatePushDevice, isExpoPushToken } from "@/lib/notifications/push";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const refreshToken =
      typeof body.refreshToken === "string"
        ? body.refreshToken
        : request.cookies.get("ridegrid_refresh_token")?.value ?? "";

    const authorization =
      request.headers.get("authorization");

    const accessToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : request.cookies.get("ridegrid_access_token")?.value ?? "";

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

    // This device stops receiving push for the signed-out account. The owner comes from
    // the refresh token being revoked, so it works after the access token expired.
    if (refreshToken && isExpoPushToken(body.pushToken)) {
      try {
        const userId = await refreshTokenService.getUserId(refreshToken);
        if (userId) await deactivatePushDevice(userId, body.pushToken);
      } catch {
        // Sign-out must complete even if push storage is unavailable.
      }
    }

    if (refreshToken) await authService.logout(session);

    const response = NextResponse.json({
      success: true,
      message: "Logout successful.",
    });

    response.cookies.delete("ridegrid_access_token");
    response.cookies.delete("ridegrid_refresh_token");
    response.cookies.delete("ridegrid-token");

    return response;
  } catch (error) {
    return apiError(error);
  }
}
