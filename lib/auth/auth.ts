import {
  AuthSession,
  AuthUser,
  LoginRequest,
  LoginResponse,
  PasswordChangeRequired,
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

import { identifierWhere, parseRole } from "./identity";
import { issueResetToken } from "./account-email";

// Without an expected role (web portal) staff accounts are tried first.
const ROLE_ORDER = ["SUPER_ADMIN", "OPERATIONS", "FINANCE", "CORPORATE_ADMIN", "VENDOR", "CORPORATE_EMPLOYEE", "DRIVER", "CUSTOMER"];
const CHANGE_TOKEN_MINUTES = 15;

export class AuthService {
  async login(
    request: LoginRequest
  ): Promise<LoginResponse | PasswordChangeRequired> {
    const identifier =
      request.identifier.trim();
    const role = parseRole(request.role);

    // The same email/mobile may belong to several roles; the password picks the account.
    const candidates =
      await prisma.user.findMany({
        where: {
          ...identifierWhere(identifier),
          deletedAt: null,
          ...(role ? { role } : {}),
        },
        take: 10,
      });
    candidates.sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role));

    let user: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (await passwordService.verify(request.password, candidate.password)) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      throw new Error(
        "Invalid email/mobile number or password."
      );
    }

    // Checked only after the password, so an account's status is never revealed
    // to someone who does not know its credentials.
    if (
      user.deletedAt ||
      !user.isActive
    ) {
      throw new Error(
        "This account is inactive or suspended. Contact RideGrid support."
      );
    }

    // A temporary password only unlocks the "choose a new password" step: no session
    // is issued, and the short-lived token is redeemed through /api/auth/reset-password.
    if (user.mustChangePassword) {
      return {
        passwordChangeRequired: true,
        changeToken: await issueResetToken(user.id, CHANGE_TOKEN_MINUTES),
        user: { name: user.name, email: user.email, role: user.role },
      };
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