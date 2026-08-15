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
    const body = await request.json();

    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      !body.email.trim() ||
      !body.password
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const result = await authService.login({
      email: body.email,
      password: body.password,
      rememberMe: body.rememberMe ?? false,
    });

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
      { status: 401 }
    );
  }
}