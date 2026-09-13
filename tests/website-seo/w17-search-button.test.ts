import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hero = readFileSync(
  "components/website-public/HeroSearch.tsx",
  "utf8",
);

const css = readFileSync(
  "components/website-public/public.module.css",
  "utf8",
);

describe("W17 homepage search CTA", () => {
  it("renders a real submit button", () => {
    expect(hero).toContain('type="submit"');
    expect(hero).toContain("Search rides");
    expect(hero).toContain("s.searchSubmit");
  });

  it("does not contain malformed retry button markup", () => {
    expect(hero).not.toContain("<buttontype");
  });

  it("gives the search CTA an explicit red background", () => {
    expect(css).toContain(".searchSubmit");
    expect(css).toContain("background: #ef233c !important");
  });
});
