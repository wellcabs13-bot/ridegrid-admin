import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SimplePricing from "@/components/pricing/SimplePricing";
vi.mock("next/dynamic", () => ({ default: () => () => <p>Existing advanced tools</p> }));
const pair = { id: "car", driverId: "driver", make: "Test", model: "Car", registrationNumber: "TEST-001", driver: { id: "driver", firstName: "Assigned", lastName: "Driver" } };
const data = { role: "SUPER_ADMIN", vendors: [{ id: "vendor", companyName: "Test vendor" }], pairs: [pair], cities: ["Pune", "Mumbai", "Nashik"], rates: [], policies: [], toursGap: "No Tour catalog or association is available." };
const requests: Record<string, any>[] = [];
beforeEach(() => { requests.length = 0; vi.stubGlobal("fetch", vi.fn(async (url, options) => {
  if (options?.method === "POST") { requests.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ success: true, data: { vehicleCount: 1, rateCount: 1, approved: 0, pending: 1 } }) }; }
  return { ok: true, json: async () => ({ success: true, data: { ...data, vendorId: String(url).includes("vendorId=") ? "vendor" : undefined } }) };
})); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function choosePair() {
  render(<SimplePricing/>);
  await screen.findByRole("option", { name: "Test vendor" });
  expect(screen.queryByText("2. Select active car + driver pairs")).toBeNull();
  fireEvent.change(screen.getByLabelText("1. Select Vendor"), { target: { value: "vendor" } });
  const checkbox = await screen.findByRole("checkbox", { name: /TEST-001/ });
  fireEvent.click(checkbox);
}
it("starts with three simple tabs and submits one-way pairs without exposing internals", async () => {
  await choosePair();
  expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Vendor Rates", "GST & Platform Fee", "Advanced"]);
  expect(screen.queryByText(/scopeKey|rateVersionId|JSON/)).toBeNull();
  fireEvent.change(screen.getByLabelText("Pickup City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("Drop City"), { target: { value: "Mumbai" } });
  fireEvent.change(screen.getByLabelText("Base Rate (₹)"), { target: { value: "2200" } });
  fireEvent.click(screen.getByRole("button", { name: "Save One-way Price" }));
  await screen.findByText(/One-way price saved for 1 vehicle/);
  expect(requests[0]).toMatchObject({ action: "simple-rates", vendorId: "vendor", service: "ONE_WAY", fare: "2200", pairs: [{ vehicleId: "car", driverId: "driver" }] });
});
it("shows only the local service inputs and treats packages separately", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Local", exact: true }));
  expect(screen.queryByLabelText("Drop City")).toBeNull();
  fireEvent.change(screen.getByLabelText("Package"), { target: { value: "12_120" } });
  expect(screen.getByLabelText("Package")).toHaveValue("12_120");
  expect(screen.getByLabelText("Extra KM Rate (₹ / km)")).toBeVisible();
  expect(screen.getByLabelText("Extra Hour Rate (₹ / hour)")).toBeVisible();
});
it("shows roundtrip daily calculation and excludes pickup from select-all cities", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Roundtrip", exact: true }));
  fireEvent.change(screen.getByLabelText("Pickup City"), { target: { value: "Pune" } });
  fireEvent.change(screen.getByLabelText("KM Per Day"), { target: { value: "300" } });
  fireEvent.change(screen.getByLabelText("Rate Per KM (₹)"), { target: { value: "14" } });
  fireEvent.change(screen.getByLabelText("Driver Allowance Per Day (₹)"), { target: { value: "500" } });
  expect(screen.getByText(/Base Rate \/ Day:/)).toHaveTextContent("4,700.00");
  fireEvent.click(screen.getByRole("button", { name: "Select all visit cities" }));
  expect(screen.getByRole("checkbox", { name: "Mumbai" })).toBeChecked();
  expect(screen.queryByRole("checkbox", { name: "Pune" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Save Roundtrip Price" }));
  await waitFor(() => expect(requests[0].destinations).toEqual(["Mumbai", "Nashik"]));
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
it("reports the real Tours gap without pretending to save an association", async () => {
  await choosePair(); fireEvent.click(screen.getByRole("button", { name: "Tours", exact: true }));
  expect(screen.getByText(data.toursGap)).toBeVisible();
  expect(screen.getByRole("button", { name: "Tour association unavailable" })).toBeDisabled();
  expect(requests).toHaveLength(0);
});
