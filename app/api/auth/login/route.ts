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

    // "identifier" is an email address or mobile number; "email" is accepted from older clients.
    const identifier =
      typeof body.identifier === "string"
        ? body.identifier
        : typeof body.email === "string"
          ? body.email
          : "";

    if (
      !identifier.trim() ||
      typeof body.password !== "string" ||
      !body.password
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Email or mobile number and password are required.",
        },
        { status: 400 }
      );
    }

    const result = await authService.login({
      identifier,
      password: body.password,
      role: body.role,
      rememberMe: body.rememberMe ?? false,
    });

    if ("passwordChangeRequired" in result) {
      return NextResponse.json({
        success: true,
        message: "Set a new password to continue.",
        data: result,
      });
    }

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