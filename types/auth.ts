/**
 * RideGrid Enterprise Platform
 * Authentication Types
 * Version: 1.0
 */

import { SecurityRole } from "./security";

export enum AuthProvider {
  LOCAL = "LOCAL",
  GOOGLE = "GOOGLE",
  MICROSOFT = "MICROSOFT",
  APPLE = "APPLE",
}

export enum AuthStatus {
  AUTHENTICATED = "AUTHENTICATED",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  EXPIRED = "EXPIRED",
  LOCKED = "LOCKED",
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  mobile?: string;

  role: SecurityRole;

  avatar?: string;

  provider: AuthProvider;

  status: AuthStatus;

  emailVerified: boolean;

  mobileVerified: boolean;

  twoFactorEnabled: boolean;

  lastLogin?: Date;
}

export interface JwtPayload {
  sub: string;

  email: string;

  role: SecurityRole;

  sessionId: string;

  iat: number;

  exp: number;
}

export interface RefreshToken {
  id: string;

  token: string;

  userId: string;

  expiresAt: Date;

  revoked: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;

  password: string;

  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;

  newPassword: string;

  confirmPassword: string;
}

export interface VerifyOTPRequest {
  otp: string;

  sessionId: string;
}

export interface AuthSession {
  sessionId: string;

  accessToken: string;

  refreshToken: string;

  expiresAt: Date;

  ipAddress: string;

  device: string;

  browser: string;
}

export interface AuthConfiguration {
  jwtSecret: string;

  jwtExpiry: string;

  refreshTokenExpiry: string;

  maxLoginAttempts: number;

  lockDurationMinutes: number;

  sessionTimeoutMinutes: number;
}