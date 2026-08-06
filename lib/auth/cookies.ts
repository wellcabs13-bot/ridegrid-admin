import { cookies } from "next/headers";

const ACCESS_TOKEN = "ridegrid_access_token";
const REFRESH_TOKEN = "ridegrid_refresh_token";

export class CookieService {
  async setAccessToken(token: string) {
    const store = await cookies();

    store.set(ACCESS_TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  async setRefreshToken(token: string) {
    const store = await cookies();

    store.set(REFRESH_TOKEN, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  async getAccessToken() {
    return (await cookies()).get(ACCESS_TOKEN)?.value;
  }

  async getRefreshToken() {
    return (await cookies()).get(REFRESH_TOKEN)?.value;
  }

  async clear() {
    const store = await cookies();

    store.delete(ACCESS_TOKEN);
    store.delete(REFRESH_TOKEN);
  }
}

export const cookieService = new CookieService();