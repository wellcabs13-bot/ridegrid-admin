import {
  AuthSession,
  AuthUser,
  LoginRequest,
  LoginResponse,
  AuthProvider,
  AuthStatus,
} from "@/types/auth";

import {
  SecurityRole,
} from "@/types/security";

import {
  prisma,
} from "@/lib/prisma";

import {
  jwtService,
} from "./jwt";

import {
  passwordService,
} from "./password";

import {
  refreshTokenService,
} from "./refresh-token";

export class AuthService {
  async login(
    request: LoginRequest
  ): Promise<LoginResponse> {
    const email =
      request.email
        .trim()
        .toLowerCase();

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      throw new Error(
        "Invalid email or password."
      );
    }

    if (
      user.deletedAt ||
      !user.isActive
    ) {
      throw new Error(
        "User account is inactive."
      );
    }

    const valid =
      await passwordService.verify(
        request.password,
        user.password
      );

    if (!valid) {
      throw new Error(
        "Invalid email or password."
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile:
        user.mobile ?? undefined,
      role:
        user.role as SecurityRole,
      provider:
        AuthProvider.LOCAL,
      status:
        AuthStatus.AUTHENTICATED,
      emailVerified:
        user.isVerified,
      mobileVerified:
        Boolean(user.mobile),
      twoFactorEnabled: false,
      lastLogin: new Date(),
    };

    const accessToken =
      await jwtService.generateAccessToken(
        authUser
      );

    const refreshToken =
      await refreshTokenService.generate(
        user.id
      );

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresAt:
        new Date(
          Date.now() +
            3600 * 1000
        ),
      user: authUser,
    };
  }

  async logout(
    session: AuthSession
  ): Promise<boolean> {
    await refreshTokenService.revoke(
      session.refreshToken
    );

    return true;
  }

  async validateSession(
    token: string
  ): Promise<AuthUser | null> {
    return jwtService.verify(
      token
    );
  }

  async refresh(
    token: string
  ) {
    const userId =
      await refreshTokenService.getUserId(
        token
      );

    if (!userId) {
      throw new Error(
        "Invalid refresh token."
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (
      !user ||
      user.deletedAt ||
      !user.isActive
    ) {
      throw new Error(
        "User account is inactive."
      );
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile:
        user.mobile ?? undefined,
      role:
        user.role as SecurityRole,
      provider:
        AuthProvider.LOCAL,
      status:
        AuthStatus.AUTHENTICATED,
      emailVerified:
        user.isVerified,
      mobileVerified:
        Boolean(user.mobile),
      twoFactorEnabled: false,
    };

    const accessToken =
      await jwtService.generateAccessToken(
        authUser
      );

    const newRefreshToken =
      await refreshTokenService.rotate(
        token
      );

    return {
      success: true,
      accessToken,
      refreshToken:
        newRefreshToken,
      expiresAt:
        new Date(
          Date.now() +
            3600 * 1000
        ),
      user: authUser,
    };
  }

  async verifyPassword(
    password: string,
    hash: string
  ) {
    return passwordService.verify(
      password,
      hash
    );
  }
}

export const authService =
  new AuthService();