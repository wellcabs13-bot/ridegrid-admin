import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SimplePricing from "@/components/pricing/SimplePricing";
vi.mock("next/dynamic", () => ({ default: () => () => <p>Existing advanced tools</p> }));
const pair = (id: string, reg: string) => ({ id, driverId: `driver-${id}`, make: "Test", model: "Car", registrationNumber: reg, driver: { id: `driver-${id}`, firstName: "Assigned", lastName: "Driver" } });
const catalog = { cities: ["Pune", "Mumbai", "Nashik"], routes: { Pune: ["Mumbai", "Nashik", "Shirdi", "Kolhapur"], Mumbai: ["Pune", "Nashik"] },
  tours: { Pune: [{ slug: "pune-to-ashtavinayak-darshan-tour", name: "Ashtavinayak Darshan", title: "Pune to Ashtavinayak Darshan" }, { slug: "pune-to-mumbai-darshan-tour", name: "Mumbai Darshan", title: "Pune to Mumbai Darshan" }, { slug: "pune-to-ganagapur-akkalkot-tour", name: "Ganagapur + Akkalkot", title: "Pune to Ganagapur + Akkalkot" }] } };
const price = (vehicleId: string, destination: string, fare: string) => ({ vehicleId, service: "OUTSTATION_ONE_WAY", city: "Pune", destination, packageName: `Pune to ${destination}`, status: "APPROVED", fare, baseKm: "0", perKm: "0", driverAllowance: "0", notes: "" });
let prices: unknown[] = [];
const data = () => ({ role: "SUPER_ADMIN", vendors: [{ id: "vendor", companyName: "Test vendor" }], pairs: [pair("car", "TEST-001"), pair("car2", "TEST-002")], cities: catalog.cities, catalog, prices, rates: [], policies: [] });
const requests: Record<string, any>[] = [];
beforeEach(() => { requests.length = 0; prices = []; vi.stubGlobal("fetch", vi.fn(async (url, options) => {
  if (options?.method === "POST") { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ success: true, data: { vehicleCount: 1, rateCount: 3, approved: 3, pending: 0, unchanged: 0, cleared: 0, routesPriced: 3, routesBlank: 1 } }) }; }
  return { ok: true, json: async () => ({ success: true, data: { ...data(), vendorId: String(url).includes("vendorId=") ? "vendor" : undefined } }) };
})); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function choosePair(...regs: string[]) {
  render(<SimplePricing/>);
  await screen.findByRole("option", { name: "Test vendor" });
  expect(screen.queryByText("2. Select active car + driver pairs")).toBeNull();
  fireEvent.change(screen.getByLabelText("1. Select Vendor"), { target: { value: "vendor" } });
  for (const reg of regs.length ? regs : ["TEST-001"]) fireEvent.click(await screen.findByRole("checkbox", { name: new RegExp(reg) }));
}
it("starts with three simple tabs and saves local prices from a city dropdown", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Local", exact: true }));
  expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Vendor Rates", "GST & Platform Fee", "Advanced"]);
  expect(screen.queryByText(/scopeKey|rateVersionId|JSON/)).toBeNull();
  expect(screen.getByLabelText("City").tagName).toBe("SELECT");
  fireEvent.change(screen.getByLabelText("City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Package"), { target: { value: "12_120" } });
  fireEvent.change(screen.getByLabelText("Base Rate (₹)"), { target: { value: "2200" } });
  fireEvent.change(screen.getByLabelText("Extra KM Rate (₹ / km)"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("Extra Hour Rate (₹ / hour)"), { target: { value: "150" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Local Price" }));
  await screen.findByText(/Local price saved/);
  expect(requests[0]).toMatchObject({ action: "simple-rates", vendorId: "vendor", service: "LOCAL", city: "Pune", package: "12_120", fare: "2200", pairs: [{ vehicleId: "car", driverId: "driver-car" }] });
});
it("loads every published Pune destination and bulk saves priced and blank one-way rows for all selected cars", async () => {
  await choosePair("TEST-001", "TEST-002");
  fireEvent.change(screen.getByLabelText("Pickup City"), { target: { value: "Pune" } });
  for (const destination of ["Mumbai", "Nashik", "Shirdi", "Kolhapur"]) expect(screen.getByRole("cell", { name: destination })).toBeVisible();
  fireEvent.change(screen.getByLabelText("One-way price for Mumbai"), { target: { value: "3200" } });
  fireEvent.change(screen.getByLabelText("One-way price for Nashik"), { target: { value: "3500" } });
  fireEvent.change(screen.getByLabelText("One-way price for Shirdi"), { target: { value: "5200" } });
  expect(screen.getByText("3 of 4 routes priced")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Save All One-way Prices" }));
  await screen.findByText(/One-way saved for 1 vehicle/);
  expect(requests[0]).toMatchObject({ action: "simple-bulk", service: "ONE_WAY", city: "Pune", pairs: [{ vehicleId: "car" }, { vehicleId: "car2" }],
    rows: [{ destination: "Mumbai", fare: "3200" }, { destination: "Nashik", fare: "3500" }, { destination: "Shirdi", fare: "5200" }, { destination: "Kolhapur", fare: "" }] });
});
it("prefills current prices and leaves car-specific differences untouched unless edited", async () => {
  prices = [price("car", "Mumbai", "3200.00"), price("car2", "Mumbai", "3200.00"), price("car", "Nashik", "3500.00"), price("car2", "Nashik", "3600.00")];
  await choosePair("TEST-001", "TEST-002");
  fireEvent.change(screen.getByLabelText("Pickup City"), { target: { value: "Pune" } });
  expect(screen.getByLabelText("One-way price for Mumbai")).toHaveValue(3200);
  expect(screen.getByLabelText("One-way price for Nashik")).toHaveAttribute("placeholder", "Varies");
  fireEvent.click(screen.getByRole("button", { name: "Save All One-way Prices" }));
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0].rows.map((r: { destination: string }) => r.destination)).toEqual(["Mumbai", "Shirdi", "Kolhapur"]);
});
it("shows the roundtrip calculation live per destination row", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Roundtrip", exact: true }));
  fireEvent.change(screen.getByLabelText("Pickup City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Base KM for Mumbai"), { target: { value: "300" } });
  fireEvent.change(screen.getByLabelText("Per KM for Mumbai"), { target: { value: "14" } });
  fireEvent.change(screen.getByLabelText("Driver allowance for Mumbai"), { target: { value: "500" } });
  expect(screen.getByLabelText("Calculated fare for Mumbai")).toHaveTextContent("4,700.00");
  fireEvent.change(screen.getByLabelText("Base KM for Nashik"), { target: { value: "250" } });
  expect(screen.getByLabelText("Calculated fare for Nashik")).toHaveTextContent("Incomplete");
  fireEvent.click(screen.getByRole("button", { name: "Save All Roundtrip Prices" }));
  await waitFor(() => expect(requests[0]).toMatchObject({ action: "simple-bulk", service: "ROUNDTRIP", rows: expect.arrayContaining([{ destination: "Mumbai", baseKm: "300", perKm: "14", driverAllowance: "500" }]) }));
});
it("lists published tours for the starting city with price and notes", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Tours", exact: true }));
  fireEvent.change(screen.getByLabelText("Tour Starting City"), { target: { value: "Mumbai" } });
  expect(screen.getByText(/No tours from Mumbai are published/)).toBeVisible();
  fireEvent.change(screen.getByLabelText("Tour Starting City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Price for Ashtavinayak Darshan"), { target: { value: "9000" } });
  fireEvent.change(screen.getByLabelText("Notes for Ashtavinayak Darshan"), { target: { value: "2 days, all 8 temples" } });
  fireEvent.change(screen.getByLabelText("Price for Mumbai Darshan"), { target: { value: "6500" } });
  expect(screen.getByText("2 of 3 tours priced")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Save All Tour Prices" }));
  await waitFor(() => expect(requests[0]).toMatchObject({ action: "simple-bulk", service: "TOUR", city: "Pune", rows: [{ tour: "pune-to-ashtavinayak-darshan-tour", fare: "9000", notes: "2 days, all 8 temples" }, { tour: "pune-to-mumbai-darshan-tour", fare: "6500", notes: "" }, { tour: "pune-to-ganagapur-akkalkot-tour", fare: "", notes: "" }] }));
});
it("shows unconfigured policy values and retains access to Advanced", async () => {
  render(<SimplePricing/>); await screen.findByRole("option", { name: "Test vendor" });
  fireEvent.click(screen.getByRole("tab", { name: "GST & Platform Fee" }));
  expect(screen.getAllByText("Not configured")).toHaveLength(2);
  expect(screen.getByLabelText("GST Percentage (%)")).toHaveValue(null);
  expect(screen.getByLabelText("Platform Fee Percentage (%)")).toHaveValue(null);
  fireEvent.click(screen.getByRole("tab", { name: "Advanced" }));
  expect(screen.getByText("Existing advanced tools")).toBeVisible();
});
