import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { success } from "@/lib/api-response";
import { apiError } from "@/lib/api-error";

const RESET_TOKEN_MINUTES = 30;

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    /*
     * Do not reveal whether an email exists.
     */
    if (!user || user.deletedAt || !user.isActive) {
      return success(
        null,
        "If the account exists, a password reset link has been requested."
      );
    }

    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const rawToken = crypto
      .randomBytes(48)
      .toString("base64url");

    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        RESET_TOKEN_MINUTES * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    console.info(
      `[AUTH] Password reset requested for ${user.email}.`
    );

    return success(
      null,
      "If the account exists, a password reset link has been requested."
    );
  } catch (error) {
    return apiError(error);
  }
}
