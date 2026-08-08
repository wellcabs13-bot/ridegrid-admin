import * as jwt from "jsonwebtoken";

import {
  AuthProvider,
  AuthStatus,
  AuthUser,
  JwtPayload,
} from "@/types/auth";

const JWT_SECRET: string =
  process.env.JWT_SECRET ??
  "ridegrid-development-secret";

export class JwtService {
  async generateAccessToken(
    user: AuthUser
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: crypto.randomUUID(),
      iat: Math.floor(
        Date.now() / 1000
      ),
      exp:
        Math.floor(
          Date.now() / 1000
        ) + 3600,
    };

    return jwt.sign(
      payload,
      JWT_SECRET,
      {
        expiresIn: 3600,
      }
    );
  }

  async verify(
    token: string
  ): Promise<AuthUser | null> {
    try {
      const decoded =
        jwt.verify(
          token,
          JWT_SECRET
        );

      if (
        typeof decoded !==
          "object" ||
        decoded === null
      ) {
        return null;
      }

      const payload =
        decoded as JwtPayload;

      return {
        id: payload.sub,
        name: "",
        email: payload.email,
        role: payload.role,
        provider:
          AuthProvider.LOCAL,
        status:
          AuthStatus.AUTHENTICATED,
        emailVerified: true,
        mobileVerified: true,
        twoFactorEnabled: false,
      };
    } catch {
      return null;
    }
  }
}

export const jwtService =
  new JwtService();