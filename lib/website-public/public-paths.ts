// Public website and marketplace paths. Anonymous visitors to these pages need no
// session check, so the app-wide auth provider skips its /api/auth/me probe there.
const PREFIXES = ["/marketplace", "/cities/", "/routes/", "/airports/", "/areas/", "/services/", "/vehicles/", "/tours/"];
const PAGES = new Set([
  "/", "/corporate-travel", "/partners", "/corporate-login",
  "/about", "/contact", "/privacy-policy", "/terms-and-conditions", "/cancellation-refund-policy", "/cookie-policy",
  "/accessibility", "/disclaimer", "/business-travel-terms", "/payment-refund-information", "/account-deletion",
]);

// "/vehicles" itself is the Super Admin fleet page (app/vehicles); only "/vehicles/<slug>" is public.
const ADMIN_INDEX_PAGES = new Set(["/vehicles"]);

export function isPublicWebsitePath(pathname: string) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (ADMIN_INDEX_PAGES.has(path)) return false;
  return PAGES.has(path) || PREFIXES.some((p) => path === p.replace(/\/$/, "") || path.startsWith(p.endsWith("/") ? p : `${p}/`));
}
