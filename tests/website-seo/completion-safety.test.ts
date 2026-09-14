// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { INFO_PAGES, PUBLIC_BUSINESS_REVIEW } from "../../lib/website-public/info";
import { publicHref } from "../../lib/website-public/safety";
import { websiteSeoNavigation } from "../../lib/website-seo/navigation";
import { middleware, config } from "../../middleware";
import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { vi } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir,entry.name)) : /\.(tsx?|css|json|md)$/.test(entry.name) ? [path.join(dir,entry.name)] : []);
}
describe("Website completion source safety", () => {
  it("keeps public and Website SEO source valid UTF-8 without BOM or mojibake", () => {
    const roots = ["app/(website-public)","app/website-seo","app/api/website-seo","components/website-public","components/website-seo","lib/website-public","lib/website-seo","scripts/website-seo"];
    const bad: string[] = [];
    for (const file of roots.flatMap(files)) {
      const bytes = readFileSync(file);
      try {
        const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if ((bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191) || /\u00c2|\u00c3|\ufffd|\u00e2[\u0080-\uffff]/u.test(content)) bad.push(file);
      } catch { bad.push(file); }
    }
    expect(bad).toEqual([]);
  });
  it.each(INFO_PAGES)("has a first-class safe route for $slug", page => {
    expect(existsSync(`app/(website-public)/${page.slug}/page.tsx`)).toBe(true);
    expect(publicHref(`/${page.slug}`)).toBe(`/${page.slug}`);
    expect(page.sections.length).toBeGreaterThan(1);
  });
  it("keeps unverified business details explicit and unclaimed", () => {
    expect(Object.values(PUBLIC_BUSINESS_REVIEW).every(value => value === null)).toBe(true);
    expect(INFO_PAGES.find(p => p.slug === "privacy-policy")?.review).toBe(true);
  });
  it.each(websiteSeoNavigation)("resolves dashboard destination $title", item => {
    expect(existsSync(`app${item.href}/page.tsx`)).toBe(true);
  });
  it("does not extend middleware into public or business routes", () => {
    expect(config.matcher).toEqual(["/website-seo/:path*", "/api/website-seo/:path*"]);
  });
});
describe("Website SEO access boundary", () => {
  function request(role: string, exp = Math.floor(Date.now()/1000)+60, origin?: string) {
    const header = Buffer.from(JSON.stringify({alg:"HS256"})).toString("base64url");
    const body = Buffer.from(JSON.stringify({role,exp})).toString("base64url");
    const signature = createHmac("sha256","unit-test-key").update(`${header}.${body}`).digest("base64url");
    return new NextRequest("https://www.wellcabs.com/api/website-seo/entities/sync", { method:"POST",headers:{ cookie:`ridegrid_access_token=${header}.${body}.${signature}`, ...(origin ? {origin} : {}) } });
  }
  it("allows a signed administrator but rejects other roles, expired tokens and cross-site writes", async () => {
    vi.stubEnv("JWT_SECRET","unit-test-key");
    try {
      expect((await middleware(request("SUPER_ADMIN"))).status).toBe(200);
      expect((await middleware(request("CUSTOMER"))).status).toBe(403);
      expect((await middleware(request("SUPER_ADMIN",1))).status).toBe(403);
      expect((await middleware(request("SUPER_ADMIN",Math.floor(Date.now()/1000)+60,"https://attacker.invalid"))).status).toBe(403);
      expect((await middleware(new NextRequest("https://www.wellcabs.com/website-seo"))).headers.get("location")).toBe("https://www.wellcabs.com/login");
    } finally { vi.unstubAllEnvs(); }
  });
});
