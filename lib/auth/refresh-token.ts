import crypto from "crypto";

interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

const REFRESH_TOKEN_DAYS = 30;

export class RefreshTokenService {
  private tokens =
    new Map<
      string,
      RefreshTokenRecord
    >();

  async generate(
    userId: string
  ): Promise<string> {
    if (!userId) {
      throw new Error(
        "User ID is required."
      );
    }

    const token =
      crypto.randomBytes(64)
        .toString("base64url");

    const expiresAt =
      new Date(
        Date.now() +
          1000 *
            60 *
            60 *
            24 *
            REFRESH_TOKEN_DAYS
      );

    this.tokens.set(token, {
      token,
      userId,
      expiresAt,
      revoked: false,
    });

    return token;
  }

  async validate(
    token: string
  ): Promise<boolean> {
    const record =
      this.tokens.get(token);

    if (!record) {
      return false;
    }

    if (record.revoked) {
      return false;
    }

    if (
      record.expiresAt <=
      new Date()
    ) {
      this.tokens.delete(token);
      return false;
    }

    return true;
  }

  async getUserId(
    token: string
  ): Promise<string | null> {
    const valid =
      await this.validate(token);

    if (!valid) {
      return null;
    }

    return (
      this.tokens.get(token)
        ?.userId ?? null
    );
  }

  async revoke(
    token: string
  ): Promise<void> {
    const record =
      this.tokens.get(token);

    if (record) {
      record.revoked = true;
    }
  }

  async rotate(
    oldToken: string
  ): Promise<string> {
    const record =
      this.tokens.get(oldToken);

    if (!record) {
      throw new Error(
        "Invalid refresh token."
      );
    }

    const valid =
      await this.validate(
        oldToken
      );

    if (!valid) {
      throw new Error(
        "Refresh token expired or revoked."
      );
    }

    await this.revoke(
      oldToken
    );

    return this.generate(
      record.userId
    );
  }

  clear(): void {
    this.tokens.clear();
  }
}

export const refreshTokenService =
  new RefreshTokenService();