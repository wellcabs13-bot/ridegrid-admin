import { LoginRequest, RegisterRequest } from '@/types/auth';

export const AuthService = {
  async login(data: LoginRequest) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Login failed');
    }

    return {
      token: result.token,
      user: result.user,
    };
  },

  async register(data: RegisterRequest) {
    // Placeholder for upcoming Sprint 3.3
    return {
      success: true,
      message: 'Registration endpoint coming soon.',
    };
  },

  async logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });

    localStorage.removeItem('ridegrid-auth');
  },
};