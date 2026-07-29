import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in environment variables.");
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}