import { INFO_PAGES } from "./info";
export function publicHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || /[\\\u0000-\u0020]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try {
      const url = new URL(value, "https://public.invalid");
      const decoded = decodeURIComponent(url.pathname);
      if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith("//")) return null;
      // Public destinations only; dashboard and API paths are never menu targets.
      if (decoded !== "/" && !INFO_PAGES.some(page => decoded.replace(/\/$/, "") === `/${page.slug}`) && !/^\/(marketplace(?:\/(?:results|booking|payment))?|(?:routes|cities|services|airports|areas|vehicles|tours)\/[a-z0-9-]+|(?:services|vehicles)\/[a-z0-9-]+\/[a-z0-9-]+)\/?$/.test(decoded)) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch { return null; }
  }
  try { const url = new URL(value); if (["wellcabs.com", "www.wellcabs.com"].includes(url.hostname) && !publicHref(`${url.pathname}${url.search}${url.hash}`)) return null; return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function jsonLd(value: unknown): string { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
