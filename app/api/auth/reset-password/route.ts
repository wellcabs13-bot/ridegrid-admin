import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import { refreshTokenService } from "@/lib/auth/refresh-token";

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const token =
      typeof body.token === "string"
        ? body.token.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const confirmPassword =
      typeof body.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!token || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Reset token, password and confirm password are required.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    const validation =
      passwordService.validateStrength(password);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Password does not meet security requirements.",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const resetToken =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
      });

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset token.",
        },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "This reset token has already been used.",
        },
        { status: 400 }
      );
    }

    if (resetToken.expiresAt <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired reset token.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: resetToken.userId,
      },
    });

    if (
      !user ||
      user.deletedAt ||
      !user.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "User account is inactive.",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await passwordService.hash(password);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: passwordHash,
        },
      }),

      prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),

      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          id: {
            not: resetToken.id,
          },
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    await refreshTokenService.revokeAllForUser(
      user.id
    );

    const response = NextResponse.json({
      success: true,
      message:
        "Password updated successfully.",
      data: null,
    });

    response.cookies.delete(
      "ridegrid_access_token"
    );

    response.cookies.delete(
      "ridegrid_refresh_token"
    );

    response.cookies.delete(
      "ridegrid-token"
    );

    return response;
  } catch (error) {
    console.error(
      "POST /api/auth/reset-password",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Password reset failed.",
      },
      { status: 500 }
    );
  }
}