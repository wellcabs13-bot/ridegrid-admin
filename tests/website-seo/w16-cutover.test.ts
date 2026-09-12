import {
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  describe,
  expect,
  it,
} from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(
    join(root, path),
    "utf8"
  );
}

describe("W16 public root cutover", () => {
  it("moves the Admin Dashboard away from root", () => {
    expect(
      existsSync(
        join(root, "app", "page.tsx")
      )
    ).toBe(false);

    expect(
      existsSync(
        join(
          root,
          "app",
          "admin",
          "page.tsx"
        )
      )
    ).toBe(true);
  });

  it("provides the W14 homepage at public root", () => {
    const page = read(
      "app/(website-public)/page.tsx"
    );

    expect(page).toContain(
      'from "@/components/website-public/Homepage"'
    );

    expect(page).toContain(
      "resolveHomepage"
    );
  });

  it("does not globally noindex the live public layout", () => {
    const layout = read(
      "app/(website-public)/layout.tsx"
    );

    expect(layout).not.toContain(
      "index: false"
    );

    expect(layout).not.toContain(
      "follow: false"
    );
  });

  it("redirects the old preview route to root", () => {
    const preview = read(
      "app/(website-public)/website-preview/page.tsx"
    );

    expect(preview).toContain(
      'redirect("/")'
    );
  });

  it("points admin navigation at /admin", () => {
    const data = read(
      "components/navigation/navigation-data.ts"
    );

    expect(data).toContain(
      'href: "/admin"'
    );
  });

  it("sends successful login to /admin", () => {
    const login = read(
      "components/auth/LoginForm.tsx"
    );

    expect(login).toMatch(
      /router\.push\(["']\/admin["']\)/
    );
  });

  it("points the public brand at live root", () => {
    const shell = read(
      "components/website-public/PublicShell.tsx"
    );

    expect(shell).toContain(
      'href="/"'
    );

    expect(shell).not.toContain(
      'href="/website-preview"'
    );
  });

  it("contains no known public mojibake artifacts", () => {
    const files = [
      "components/website-public/PublicShell.tsx",
      "components/website-public/Homepage.tsx",
      "lib/website-public/homepage.ts",
    ];

    for (const file of files) {
      const content = read(file);

      expect(content).not.toMatch(
        /Â|â†|â‚/
      );
    }
  });

  it("serves robots from a standard route", () => {
    const robots = read(
      "app/robots.ts"
    );

    expect(robots).toContain(
      "/sitemap.xml"
    );

    expect(robots).toContain(
      '"/admin"'
    );
  });

  it("reuses W7 for standard sitemap.xml", () => {
    const sitemap = read(
      "app/sitemap.xml/route.ts"
    );

    expect(sitemap).toContain(
      "@/app/api/website-seo/sitemap/route"
    );
  });
});