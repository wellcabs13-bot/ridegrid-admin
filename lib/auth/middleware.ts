import { jwtService } from "./jwt";
import { SecurityRole } from "@/types/security";

export async function authenticate(token?: string) {
  if (!token) {
    return null;
  }

  return jwtService.verify(token);
}

export async function authorize(
  token: string | undefined,
  roles: SecurityRole[]
) {
  const user = await authenticate(token);

  if (!user) {
    return {
      authorized: false,
      user: null,
    };
  }

  return {
    authorized: roles.includes(user.role),
    user,
  };
}