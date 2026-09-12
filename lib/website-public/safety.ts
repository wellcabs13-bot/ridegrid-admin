export function publicHref(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || /[\\\u0000-\u0020]/.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) {
    try {
      const url = new URL(value, "https://public.invalid");
      const decoded = decodeURIComponent(url.pathname);
      if (/[\\\u0000-\u0020]/.test(decoded) || decoded.startsWith("//")) return null;
      // Admin root remains reserved until W16. No public admin/API navigation.
      if (url.pathname === "/") return `/website-preview${url.search}${url.hash}`;
      if (/^\/(api|website-seo|dashboard)(\/|$)/.test(decoded)) return null;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch { return null; }
  }
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function jsonLd(value: unknown): string { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029"); }
