import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ContactPage from "../../components/website-public/ContactPage";
import PublicShell from "../../components/website-public/PublicShell";
import { WELLCABS } from "../../lib/website-public/brand";

const state = vi.hoisted(() => ({ pathname: "/contact" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
beforeEach(() => {
  state.pathname = "/contact";
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("connects the contact hub to the approved phone, email, address and WhatsApp message", () => {
  render(<ContactPage navigation={[]} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good journeys begin");
  expect(screen.getByRole("link", { name: "Call us" })).toHaveAttribute("href", "tel:+919011079304");
  expect(screen.getByRole("link", { name: /Put it in an email/ })).toHaveAttribute("href", "mailto:service@wellcabs.com");
  const whatsapp = screen.getByRole("link", { name: /WhatsApp Wellcabs on/ });
  const url = new URL(whatsapp.getAttribute("href")!);
  expect(url.hostname).toBe("wa.me");
  expect(url.pathname).toBe("/919011079304");
  expect(url.searchParams.get("text")).toBe("Hello Wellcabs, I would like help with a cab booking.");
  expect(screen.getByRole("link", { name: /Open in Google Maps/ })).toHaveAttribute("href", WELLCABS.mapHref);
  expect(screen.getAllByText(WELLCABS.address).length).toBe(2);
});

it("leaves reduced-motion content visible and closes the menu with Escape", () => {
  const { container } = render(<ContactPage navigation={[]} />);
  expect(container.querySelector('[data-reveal-state="pending"]')).toBeNull();
  const menu = container.querySelector("header details") as HTMLDetailsElement;
  menu.open = true;
  fireEvent.keyDown(document, { key: "Escape" });
  expect(menu.open).toBe(false);
  expect(menu.querySelector("summary")).toHaveFocus();
  menu.open = true;
  fireEvent.click(menu.querySelector('a[href="/#ride-search"]')!);
  expect(menu.open).toBe(false);
});

it("keeps the floating control away from marketplace booking screens", () => {
  state.pathname = "/marketplace/booking";
  render(<PublicShell navigation={[]}><h1>Booking</h1></PublicShell>);
  expect(screen.queryByRole("link", { name: /Chat with Wellcabs on WhatsApp/ })).toBeNull();
  expect(screen.getAllByRole("link", { name: /WhatsApp Wellcabs/ }).length).toBeGreaterThan(0);
});
