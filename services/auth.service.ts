import { LoginRequest, RegisterRequest, UserRole } from '@/types/auth';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const AuthService = {
  async login(data: LoginRequest) {
    await delay(800);

    return {
      token: 'ridegrid-demo-token',
      user: {
        id: '1',
        name: 'RideGrid Admin',
        email: data.email,
        mobile: '9999999999',
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
      },
    };
  },

  async register(data: RegisterRequest) {
    await delay(800);

    return {
      success: true,
      message: 'Registration Successful',
    };
  },

  logout() {
    localStorage.removeItem('ridegrid-auth');
  },
};
