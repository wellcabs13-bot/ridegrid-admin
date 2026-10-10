export interface LoginRequest {
  /** Email address or mobile number. */
  identifier: string;
  password: string;
  role?: string;
}

class AuthServiceClass {
  async login(data: LoginRequest) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to sign in. Please try again.");
    }

    // A temporary password must be replaced before a session is issued.
    if (result.data?.passwordChangeRequired && result.data.changeToken) {
      window.location.assign(`/reset-password?token=${encodeURIComponent(result.data.changeToken)}&first=1`);
      throw new Error("Set a new password to continue.");
    }
    if (!result.data?.user?.id) throw new Error("Invalid sign-in response.");
    return result.data;
  }

  async logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
  }

  async me() {
    let response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401) {
      const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (refreshed.ok) response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    if (!result.data?.id) throw new Error("Invalid session response.");
    return result.data;
  }
}

export const AuthService = new AuthServiceClass();
