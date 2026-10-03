import { NextRequest, NextResponse } from "next/server";

// Protect only Website & SEO. Public routes and all operational modules retain
// their existing routing/authentication behavior. WebCrypto is Edge-compatible.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("ridegrid_access_token")?.value;
  let allowed = false;
  try {
    const secret = process.env.JWT_SECRET;
    if (token && secret) {
      const parts = token.split(".");
      if (parts.length !== 3 || token.length > 8192) throw new Error("Invalid token");
      const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
      const header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
      const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
      if (header.alg !== "HS256" || typeof claims.exp !== "number" || claims.exp <= Date.now() / 1000 || (claims.nbf && claims.nbf > Date.now() / 1000)) throw new Error("Invalid token");
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
      allowed = claims.role === "SUPER_ADMIN" && await crypto.subtle.verify("HMAC", key, decode(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    }
  } catch { allowed = false; }
  if (!allowed) {
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ success: false, error: "Website & SEO administrator access required." }, { status: 403 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ success: false, error: "Cross-site changes are not allowed." }, { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/website-seo/:path*", "/api/website-seo/:path*"] };
