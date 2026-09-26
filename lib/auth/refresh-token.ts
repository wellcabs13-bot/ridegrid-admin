import crypto from "crypto";

import { prisma } from "@/lib/prisma";

const REFRESH_TOKEN_DAYS = 30;

interface RefreshTokenResult {
  token: string;
  userId: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export class RefreshTokenService {
  async generate(userId: string): Promise<string> {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const token = crypto
      .randomBytes(64)
      .toString("base64url");

    const expiresAt = new Date(
      Date.now() +
        1000 *
          60 *
          60 *
          24 *
          REFRESH_TOKEN_DAYS
    );

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async validate(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    const record =
      await prisma.refreshToken.findUnique({
        where: {
          tokenHash: hashToken(token),
        },
      });

    if (!record) {
      return false;
    }

    if (record.revokedAt) {
      return false;
    }

    if (record.expiresAt <= new Date()) {
      return false;
    }

    return true;
  }

  async getUserId(
    token: string
  ): Promise<string | null> {
    if (!token) {
      return null;
    }

    const record =
      await prisma.refreshToken.findUnique({
        where: {
          tokenHash: hashToken(token),
        },
      });

    if (!record) {
      return null;
    }

    if (record.revokedAt) {
      return null;
    }

    if (record.expiresAt <= new Date()) {
      return null;
    }

    return record.userId;
  }

  async revoke(token: string): Promise<void> {
    if (!token) {
      return;
    }

    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async rotate(
    oldToken: string
  ): Promise<string> {
    const userId =
      await this.getUserId(oldToken);

    if (!userId) {
      throw new Error(
        "Refresh token expired or revoked."
      );
    }

    await this.revoke(oldToken);

    return this.generate(userId);
  }

  async revokeAllForUser(
    userId: string
  ): Promise<void> {
    if (!userId) {
      return;
    }

    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

export const refreshTokenService =
  new RefreshTokenService();