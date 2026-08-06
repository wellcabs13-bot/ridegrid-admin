import { SecurityRole } from "@/types/security";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: SecurityRole;
}

export class AuthService {
  async login(email: string, password: string) {
    console.log("[Auth] Login", email);

    return {
      success: true,
      token: "",
      refreshToken: "",
    };
  }

  async logout(userId: string) {
    console.log("[Auth] Logout", userId);
    return true;
  }

  async refreshToken(refreshToken: string) {
    console.log("[Auth] Refresh Token");

    return {
      token: "",
      refreshToken,
    };
  }

  async me(): Promise<AuthUser | null> {
    return null;
  }

  async forgotPassword(email: string) {
    console.log("[Auth] Forgot Password", email);
  }

  async resetPassword(
    token: string,
    password: string
  ) {
    console.log("[Auth] Reset Password", token);
  }
}

export const authService = new AuthService();