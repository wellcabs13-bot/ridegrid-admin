import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import HeroSearch from "../../components/website-public/HeroSearch";
import { PublicFooter, PublicHeader } from "../../components/website-public/PublicShell";
import { popularRoutes } from "../../components/website-public/HomepageMarketplaceRoutes";
import { publicNavigation, PUBLIC_MENU } from "../../lib/website-public/navigation";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/" }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const options = [
  { rateId: "r1", service: "ONE_WAY", vehicleCategory: "HATCHBACK", packageName: "Pune to Mumbai", fromCity: "pune", toCity: "mumbai", city: "pune" },
  { rateId: "r2", service: "ROUNDTRIP", vehicleCategory: "HATCHBACK", packageName: "Pune to Mumbai", fromCity: "pune", toCity: "mumbai", city: "pune" },
  { rateId: "r3", service: "ROUNDTRIP", vehicleCategory: "HATCHBACK", packageName: "Pune to Surat", fromCity: "pune", toCity: "surat", city: "pune" },
  { rateId: "r4", service: "LOCAL", vehicleCategory: "HATCHBACK", packageName: "8 Hrs / 80 Kms", fromCity: "", toCity: "", city: "pune" },
];

describe("homepage search uses the current marketplace", () => {
  it("renders server-provided options without a browser request", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<HeroSearch initialOptions={options} />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Journey type" })).toHaveTextContent(/One Way.*Round Trip.*Local.*Airport.*Tours/);
    vi.unstubAllGlobals();
  });
  it("sends the party size so results show only cars with enough seats", () => {
    const { container } = render(<HeroSearch initialOptions={options} />);
    fireEvent.change(screen.getByLabelText(/Pickup city/), { target: { value: "pune" } });
    fireEvent.change(screen.getByLabelText("Destination"), { target: { value: "mumbai" } });
    fireEvent.change(screen.getByLabelText(/Pickup date/), { target: { value: "2099-02-01" } });
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "09:00" } });
    fireEvent.change(screen.getByLabelText(/Passengers/), { target: { value: "5" } });
    fireEvent.submit(container.querySelector("form")!);
    const url = new URL(push.mock.calls[0][0], "https://www.wellcabs.com");
    expect(url.pathname).toBe("/marketplace/results");
    expect(url.searchParams.get("serviceType")).toBe("OUTSTATION");
    expect(url.searchParams.get("passengers")).toBe("5");
    expect(url.searchParams.has("price")).toBe(false);
  });
  it("searches airport transfers through the central listing service", () => {
    const { container } = render(<HeroSearch initialOptions={options} />);
    fireEvent.click(screen.getByRole("button", { name: "Airport" }));
    fireEvent.change(screen.getByLabelText(/Transfer/), { target: { value: "DROP" } });
    fireEvent.change(screen.getByLabelText(/Airport city/), { target: { value: "Pune" } });
    fireEvent.change(screen.getByLabelText(/Pickup date/), { target: { value: "2099-02-01" } });
    fireEvent.change(screen.getByLabelText("Pickup time"), { target: { value: "05:00" } });
    fireEvent.submit(container.querySelector("form")!);
    const url = new URL(push.mock.calls[0][0], "https://www.wellcabs.com");
    expect(url.pathname).toBe("/marketplace/results");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ serviceType: "AIRPORT", pickupCity: "Pune", airportDirection: "DROP" });
  });
  it("offers only live local packages", () => {
    render(<HeroSearch initialOptions={options} />);
    fireEvent.click(screen.getByRole("button", { name: "Local" }));
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "pune" } });
    const pkg = screen.getByLabelText("Journey package") as HTMLSelectElement;
    expect([...pkg.options].map((o) => o.text)).toEqual(["Choose a package", "8 Hrs / 80 Kms"]);
  });
});

describe("popular routes come from live central options", () => {
  it("groups routes, links to real route pages and never shows a price", () => {
    const routes = popularRoutes(options);
    expect(routes.map((r) => `${r.from}>${r.to}`)).toEqual(["Pune>Mumbai", "Pune>Surat"]);
    expect(routes[0]).toMatchObject({ oneWay: true, roundTrip: true, href: "/routes/pune-to-mumbai-cab" });
    expect(routes[1].href).toBe("/marketplace");
    expect(JSON.stringify(routes)).not.toMatch(/fare|price|₹/i);
    expect(popularRoutes([])).toEqual([]);
  });
});

describe("anonymous public pages skip the session probe", () => {
  it("covers every public page and no application area", async () => {
    const { isPublicWebsitePath } = await import("../../lib/website-public/public-paths");
    const { INFO_PAGES } = await import("../../lib/website-public/info");
    for (const page of INFO_PAGES) expect(isPublicWebsitePath(`/${page.slug}`)).toBe(true);
    for (const p of ["/", "/marketplace", "/marketplace/results", "/routes/pune-to-mumbai-cab", "/cities/pune", "/corporate-travel", "/corporate-login"]) expect(isPublicWebsitePath(p)).toBe(true);
    for (const p of ["/admin", "/corporate-admin", "/corporate-admin/billing", "/corporate", "/bookings", "/website-seo", "/login", "/marketplaces"]) expect(isPublicWebsitePath(p)).toBe(false);
  });
});

describe("public navigation", () => {
  it("exposes corporate and partner sign-in but never staff or dashboard paths", () => {
    const nav = publicNavigation([], false);
    const { container } = render(<><PublicHeader navigation={nav} /><PublicFooter navigation={nav} /></>);
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(hrefs).toContain("/corporate-login");
    expect(hrefs).toContain("/partners#drivers");
    expect(hrefs).toContain("/partners#vendors");
    expect(hrefs.filter((h) => /^\/(admin|login|website-seo|bookings|corporate(\/|$)|finance)/.test(h))).toEqual([]);
    expect(Object.values(PUBLIC_MENU).flat().map((l) => l.href).filter((h) => /^\/(admin|login)/.test(h))).toEqual([]);
  });
  it("does not advertise store downloads for unreleased apps", () => {
    render(<PublicFooter navigation={[]} />);
    expect(document.body.textContent).not.toMatch(/Download on the App Store|Get it on Google Play/);
    expect(document.body.textContent).toMatch(/not yet available in app stores/);
  });
  it("has no invented statistics, ratings or testimonials on the homepage", () => {
    const source = readFileSync("components/website-public/Homepage.tsx", "utf8");
    expect(source).not.toMatch(/\d[\d,]*\+\s*(customers|drivers|cities|trips)|4\.\d\s*(\/5|rating|stars)|testimonial/i);
  });
});
