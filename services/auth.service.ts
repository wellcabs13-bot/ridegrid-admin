export interface LoginRequest {
  email: string;
  password: string;
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
      throw new Error(result.message);
    }

    return result;
  }

  async logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
  }

  async me() {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    return result.user;
  }
}

export const AuthService = new AuthServiceClass();