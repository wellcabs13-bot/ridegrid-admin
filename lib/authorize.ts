import { verifyToken } from "./auth-server";

type AuthorizationRole = string;

export function authorize(
  token: string | undefined,
  roles: AuthorizationRole[]
) {
  if (!token) return null;

  const user = verifyToken(token);

  if (!user) return null;

  if (!roles.includes(String(user.role))) {
    return null;
  }

  return user;
}

