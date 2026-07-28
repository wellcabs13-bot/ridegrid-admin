export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  VENDOR = 'VENDOR',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
  CORPORATE_EMPLOYEE = 'CORPORATE_EMPLOYEE',
  TRAVEL_MANAGER = 'TRAVEL_MANAGER',
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  avatar?: string;
  companyId?: string;
  vendorId?: string;
  isVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}
