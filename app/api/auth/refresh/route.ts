import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authService,
} from "@/lib/auth/auth";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (
      !body.refreshToken
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Refresh token is required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await authService.refresh(
        body.refreshToken
      );

    const response =
      NextResponse.json({
        success: true,
        data: result,
      });

    response.cookies.set(
      "ridegrid-token",
      result.accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/refresh",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Invalid refresh token.",
      },
      {
        status: 401,
      }
    );
  }
}