import crypto from "crypto";

interface RefreshTokenRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
}

export class RefreshTokenService {
  private tokens = new Map<string, RefreshTokenRecord>();

  async generate(userId: string): Promise<string> {
    const token = crypto.randomUUID();

    this.tokens.set(token, {
      token,
      userId,
      expiresAt: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 30
      ), // 30 Days
      revoked: false,
    });

    return token;
  }

  async validate(
    token: string
  ): Promise<boolean> {
    const record = this.tokens.get(token);

    if (!record) return false;

    if (record.revoked) return false;

    if (record.expiresAt < new Date())
      return false;

    return true;
  }

  async revoke(token: string) {
    const record = this.tokens.get(token);

    if (record) {
      record.revoked = true;
    }
  }

  async rotate(
    oldToken: string
  ): Promise<string> {
    const record = this.tokens.get(oldToken);

    if (!record) {
      throw new Error("Invalid Refresh Token");
    }

    await this.revoke(oldToken);

    return this.generate(record.userId);
  }
}

export const refreshTokenService =
  new RefreshTokenService();