export { generateToken, verifyToken } from "./auth-server";
export type { AuthUser } from "./auth-server";

export const AUTH_STORAGE_KEY = "ridegrid-auth";
export const AUTH_COOKIE = "ridegrid-token";