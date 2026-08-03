import { LoginRequest, RegisterRequest } from "@/types/auth";

export const AuthService = {
  async login(data: LoginRequest) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Login failed");
    }

    return {
      user: result.user,
    };
  },

  async register(data: RegisterRequest) {
    return {
      success: true,
      message: "Registration endpoint coming soon.",
    };
  },

  async logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem("ridegrid-auth");
    }
  },
};