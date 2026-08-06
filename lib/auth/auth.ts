import {
  AuthSession,
  AuthUser,
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

import { jwtService } from "./jwt";
import { passwordService } from "./password";
import { refreshTokenService } from "./refresh-token";

export class AuthService {
  async login(
    request: LoginRequest
  ): Promise<LoginResponse> {
    /**
     * TODO
     * Validate User
     * Verify Password
     * Check Account Status
     * Check 2FA
     * Generate Tokens
     * Save Session
     */

    const user: AuthUser = {
      id: "USR-001",
      name: "Super Admin",
      email: request.email,
      role: "SUPER_ADMIN",
      provider: "LOCAL",
      status: "AUTHENTICATED",
      emailVerified: true,
      mobileVerified: true,
      twoFactorEnabled: false,
    };

    const accessToken =
      await jwtService.generateAccessToken(user);

    const refreshToken =
      await refreshTokenService.generate(user.id);

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      user,
    };
  }

  async logout(session: AuthSession) {
    await refreshTokenService.revoke(
      session.refreshToken
    );

    return true;
  }

  async validateSession(
    token: string
  ): Promise<AuthUser | null> {
    return jwtService.verify(token);
  }

  async refresh(token: string) {
    return refreshTokenService.rotate(token);
  }

  async verifyPassword(
    password: string,
    hash: string
  ) {
    return passwordService.verify(password, hash);
  }
}

export const authService =
  new AuthService();