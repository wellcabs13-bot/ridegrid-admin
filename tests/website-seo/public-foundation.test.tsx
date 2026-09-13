import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import HeroSearch from "../../components/website-public/HeroSearch";
import { PublicHeader, PublicFooter } from "../../components/website-public/PublicShell";
import { publicHref } from "../../lib/website-public/safety";
import { publicNavigation } from "../../lib/website-public/navigation";
import { validateMediaUpdate } from "../../lib/website-seo/media/validation";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("public foundation", () => {
  it.each(["HERO", "ROUTE", "CITY", "SERVICE", "AIRPORT", "AREA", "VEHICLE", "GENERAL"])("accepts the existing Media Manager category %s", category => {
    expect(validateMediaUpdate({ category })).toEqual({ category });
  });
  it.each(["/admin", "/api/files/id", "/website-preview", "/customers", "/%61pi/vendors", "https://www.wellcabs.com/dashboard", "//evil.test", "javascript:alert(1)"])("excludes nonpublic link %s", href => expect(publicHref(href)).toBeNull());
  it("preserves home anchors and safe external links", () => {
    expect(publicHref("/#ride-search")).toBe("/#ride-search");
    expect(publicHref("https://example.org/contact")).toBe("https://example.org/contact");
  });
  it("renders configured navigation and footer destinations", () => {
    const navigation = publicNavigation([], false);
    render(<><PublicHeader navigation={navigation} /><PublicFooter navigation={navigation} /></>);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile navigation", hidden: true })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Find your ride/i }).length).toBeGreaterThan(0);
  });
  it("keeps search visible while loading and when no options exist", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) }));
    render(<HeroSearch />);
    expect(screen.getByRole("button", { name: /Search rides/ })).toBeDisabled();
    await screen.findByText(/There are no journey options/);
    expect(screen.getByRole("button", { name: /Search rides/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });
  it("rejects past pickup and sends a valid trip to existing marketplace results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [{ id: "route", pricingType: "OUTSTATION", tripType: "ONEWAY", vehicleCategory: "SEDAN", packageName: "Route", fromCity: "Pune", toCity: "Mumbai", city: null }] }) }));
    const { container } = render(<HeroSearch />);
    await screen.findByLabelText(/Pickup city/);
    fireEvent.change(screen.getByLabelText(/Pickup city/), { target: { value: "Pune" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "Mumbai" } });
    fireEvent.change(screen.getByLabelText(/Pickup date/), { target: { value: "2020-01-01" } });
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "10:30" } });
    fireEvent.submit(container.querySelector("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("future pickup");
    expect(push).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Pickup date/), { target: { value: "2099-01-01" } });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(push.mock.calls[0][0]).toMatch(/^\/marketplace\/results\?/);
    expect(push.mock.calls[0][0]).not.toContain("price=");
  });
  it("keeps shared responsive, focus, media and SEO contracts", () => {
    const read = (p: string) => readFileSync(p, "utf8");
    expect(read("components/website-public/PublicShell.module.css")).toContain("prefers-reduced-motion");
    expect(read("components/website-public/PublicShell.module.css")).toContain(":focus-visible");
    expect(read("components/website-public/EntityPage.tsx")).toContain('category === "GENERAL"');
    expect(read("app/(website-public)/page.tsx")).toContain('canonical: "https://www.wellcabs.com/"');
    for (const file of ["HeroSearch.tsx", "public.module.css", "Homepage.tsx", "PublicState.tsx"]) {
      expect(read(`components/website-public/${file}`)).not.toMatch(/Ã|Â|â€|\/website-preview/);
    }
  });
});
