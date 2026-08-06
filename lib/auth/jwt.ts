import { AuthUser, JwtPayload } from "@/types/auth";

export class JwtService {
  async generateAccessToken(
    user: AuthUser
  ): Promise<string> {
    /**
     * Future
     * jose / jsonwebtoken
     */

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    return btoa(JSON.stringify(payload));
  }

  async verify(
    token: string
  ): Promise<AuthUser | null> {
    try {
      const payload = JSON.parse(
        atob(token)
      ) as JwtPayload;

      return {
        id: payload.sub,
        name: "",
        email: payload.email,
        role: payload.role,
        provider: "LOCAL",
        status: "AUTHENTICATED",
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