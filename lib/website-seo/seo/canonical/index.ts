import type { SeoCanonical } from "../types";

/** Only origin-relative stored page paths are accepted; queries/fragments never enter canonical output. */
export function normalizeSeoPath(value: string, trailingSlash = false): string | null {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return null;
  const path = value.split(/[?#]/, 1)[0];
  try {
    const segments = path.split("/").filter(Boolean).map(segment => {
      const decoded = decodeURIComponent(segment);
      if (decoded === "." || decoded === ".." || /[\\/\u0000-\u0020?#%]/.test(decoded)) throw new Error("Unsafe path");
      return encodeURIComponent(decoded).replace(/%3A/gi, ":").replace(/%40/gi, "@");
    });
    const normalized = `/${segments.join("/")}`;
    return trailingSlash && normalized !== "/" && !/\.[a-z0-9]+$/i.test(normalized) ? `${normalized}/` : normalized;
  } catch { return null; }
}

export function resolveSeoCanonical(pathname: string, baseUrl?: string, trailingSlash = false): SeoCanonical {
  const path = normalizeSeoPath(pathname, trailingSlash);
  if (!path) return { kind: "INVALID", path: null, url: null, reasonCodes: ["INVALID_PAGE_PATH"] };
  if (!baseUrl) return { kind: "RELATIVE", path, url: null, reasonCodes: ["SITE_ORIGIN_NOT_CONFIGURED"] };
  try {
    const base = new URL(baseUrl);
    if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") throw new Error("Invalid origin");
    return { kind: "ABSOLUTE", path, url: `${base.origin}${path}`, reasonCodes: [] };
  } catch { return { kind: "INVALID", path, url: null, reasonCodes: ["INVALID_SITE_ORIGIN"] }; }
}
