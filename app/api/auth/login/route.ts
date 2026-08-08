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
      !body.email ||
      !body.password
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    const result =
      await authService.login({
        email: body.email,
        password:
          body.password,
        rememberMe:
          body.rememberMe ??
          false,
      });

    const response =
      NextResponse.json(
        {
          success: true,
          data: result,
        },
        {
          status: 200,
        }
      );

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
      "POST /api/auth/login",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Login failed.",
      },
      {
        status: 401,
      }
    );
  }
}