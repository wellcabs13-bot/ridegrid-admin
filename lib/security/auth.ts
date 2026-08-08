import {
  AuthProvider,
  AuthStatus,
  AuthUser,
} from "@/types/auth";

import {
  SecurityRole,
} from "@/types/security";

import {
  prisma,
} from "@/lib/prisma";

import {
  encryptionService,
} from "./encryption";

import {
  auditLogger,
} from "./audit-log";

export interface SecurityLoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  message?: string;
}

export class AuthService {
  async login(
    email: string,
    password: string,
    ipAddress = "unknown",
    userAgent = "unknown"
  ): Promise<SecurityLoginResult> {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      return {
        success: false,
        message:
          "Email and password are required.",
      };
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

    if (
      !user ||
      user.deletedAt
    ) {
      await this.recordFailedLogin(
        normalizedEmail,
        ipAddress,
        userAgent
      );

      return {
        success: false,
        message:
          "Invalid email or password.",
      };
    }

    if (!user.isActive) {
      return {
        success: false,
        message:
          "Your account is inactive.",
      };
    }

    const validPassword =
      await encryptionService.verify(
        password,
        user.password
      );

    if (!validPassword) {
      await this.recordFailedLogin(
        normalizedEmail,
        ipAddress,
        userAgent
      );

      return {
        success: false,
        message:
          "Invalid email or password.",
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

    const token =
      encryptionService.generateToken(
        96
      );

    const refreshToken =
      encryptionService.generateToken(
        128
      );

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        device:
          this.detectDevice(userAgent),
        browser:
          this.detectBrowser(userAgent),
        os:
          this.detectOS(userAgent),
        loginTime: new Date(),
      },
    });

    await auditLogger.log({
      userId: user.id,
      action: "LOGIN",
      entityName: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      token,
      refreshToken,
      user: authUser,
    };
  }

  async logout(
    userId: string,
    ipAddress = "unknown",
    userAgent = "unknown"
  ): Promise<boolean> {
    const latestLogin =
      await prisma.loginHistory.findFirst({
        where: {
          userId,
          logoutTime: null,
        },
        orderBy: {
          loginTime: "desc",
        },
      });

    if (latestLogin) {
      await prisma.loginHistory.update({
        where: {
          id: latestLogin.id,
        },
        data: {
          logoutTime: new Date(),
        },
      });
    }

    await auditLogger.log({
      userId,
      action: "LOGOUT",
      entityName: "User",
      entityId: userId,
      ipAddress,
      userAgent,
    });

    return true;
  }

  async refreshToken(
    refreshToken: string
  ) {
    if (!refreshToken) {
      throw new Error(
        "Refresh token is required."
      );
    }

    return {
      token:
        encryptionService.generateToken(
          96
        ),
      refreshToken:
        encryptionService.generateToken(
          128
        ),
    };
  }

  async me(
    userId?: string
  ): Promise<AuthUser | null> {
    if (!userId) {
      return null;
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
      return null;
    }

    return {
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
  }

  async forgotPassword(
    email: string
  ) {
    const user =
      await prisma.user.findUnique({
        where: {
          email:
            email.trim().toLowerCase(),
        },
      });

    if (!user) {
      return {
        success: true,
      };
    }

    const token =
      encryptionService.generateToken(
        64
      );

    return {
      success: true,
      token,
      userId: user.id,
    };
  }

  async resetPassword(
    token: string,
    password: string
  ) {
    if (!token || !password) {
      throw new Error(
        "Reset token and password are required."
      );
    }

    if (
      !this.isStrongPassword(password)
    ) {
      throw new Error(
        "Password does not meet security requirements."
      );
    }

    return {
      success: true,
      message:
        "Password reset request accepted.",
    };
  }

  private async recordFailedLogin(
    email: string,
    ipAddress: string,
    userAgent: string
  ) {
    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (!user) {
      return;
    }

    await auditLogger.log({
      userId: user.id,
      action: "LOGIN_FAILED",
      entityName: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });
  }

  private detectDevice(
    userAgent: string
  ): string {
    if (/mobile/i.test(userAgent)) {
      return "Mobile";
    }

    if (/tablet/i.test(userAgent)) {
      return "Tablet";
    }

    return "Desktop";
  }

  private detectBrowser(
    userAgent: string
  ): string {
    if (/edg/i.test(userAgent)) {
      return "Edge";
    }

    if (/chrome/i.test(userAgent)) {
      return "Chrome";
    }

    if (/firefox/i.test(userAgent)) {
      return "Firefox";
    }

    if (/safari/i.test(userAgent)) {
      return "Safari";
    }

    return "Unknown";
  }

  private detectOS(
    userAgent: string
  ): string {
    if (/windows/i.test(userAgent)) {
      return "Windows";
    }

    if (/macintosh|mac os/i.test(userAgent)) {
      return "macOS";
    }

    if (/android/i.test(userAgent)) {
      return "Android";
    }

    if (/iphone|ipad|ios/i.test(userAgent)) {
      return "iOS";
    }

    if (/linux/i.test(userAgent)) {
      return "Linux";
    }

    return "Unknown";
  }

  private isStrongPassword(
    password: string
  ): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(
      password
    );
  }
}

export const authService =
  new AuthService();