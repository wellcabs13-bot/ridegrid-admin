import { UserRole } from "@prisma/client";
import { verifyToken } from "./auth-server";

export function authorize(token: string | undefined, roles: UserRole[]) {
  if (!token) return null;

  const user = verifyToken(token);

  if (!user) return null;

  if (!roles.includes(user.role as UserRole)) {
    return null;
  }

  return user;
}