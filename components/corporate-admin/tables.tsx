"use client";
import Link from "next/link";
import { Approval, Booking } from "./types";
import { Empty, inr, Status, when } from "./ui";

export function routeOf(b: Pick<Booking, "pickupLocation" | "dropLocation">) {
  return <span className="block max-w-72"><span className="block truncate">{b.pickupLocation}</span><span className="block truncate text-xs text-neutral-500">→ {b.dropLocation}</span></span>;
}

export function BookingTable({ rows, empty = "No bookings match these filters." }: { rows: Booking[]; empty?: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return <div className="overflow-x-auto"><table className="rg-table">
    <thead><tr><th>Booking</th><th>Traveller</th><th>Pickup</th><th>Route</th><th>Vendor / vehicle / driver</th><th>Status</th><th className="text-right">Fare (GST)</th></tr></thead>
    <tbody>{rows.map((b) => <tr key={b.id}>
      <td><Link className="font-semibold text-red-700" href={`/corporate-admin/bookings/${b.id}`}>{b.bookingNumber}</Link><p className="mt-1 text-xs text-neutral-500">{b.service.replaceAll("_", " ")}{b.approval ? " · approved trip" : ""}</p></td>
      <td><p className="font-semibold">{b.traveller}{b.isGuest && <span className="ml-1.5 rounded-full bg-neutral-900 px-1.5 py-0.5 align-middle text-[9.5px] font-bold uppercase tracking-wide text-white">Guest</span>}</p><p className="text-xs text-neutral-500">{b.isGuest ? (b.guest?.mobile ?? "") : b.employee?.department?.name ?? b.employee?.code ?? ""}</p></td>
      <td className="whitespace-nowrap">{when(b.pickupDateTime)}</td>
      <td>{routeOf(b)}</td>
      <td><p className="truncate">{b.vendor.companyName}</p><p className="text-xs text-neutral-500">{b.vehicle.make} {b.vehicle.model} · {b.vehicle.registrationNumber}</p><p className="text-xs text-neutral-500">{b.driver ? `Driver: ${b.driver.name}` : "Driver not assigned"}</p></td>
      <td><div className="flex flex-col items-start gap-1"><Status value={b.status}/>{b.tripStatus && b.tripStatus !== "ASSIGNED" && <Status value={b.tripStatus}/>}{b.archived && <Status value="ARCHIVED"/>}</div></td>
      <td className="whitespace-nowrap text-right"><p className="font-medium">{inr(b.finalFare)}</p>{b.gst && <p className="text-xs text-neutral-500">GST {inr(b.gst)}</p>}{b.credit && <p className="mt-0.5 text-xs text-neutral-500">{b.credit === "CHARGED" ? "Corporate credit" : b.credit === "CREDIT_RESTORED" ? "Credit restored" : b.credit === "NOT_CHARGED" ? "Not charged" : ""}</p>}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function ApprovalTable({ rows, empty = "No approval requests match these filters.", compact = false }: { rows: Approval[]; empty?: string; compact?: boolean }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  const full = compact ? "hidden" : "";
  return <div className="overflow-x-auto"><table className="rg-table">
    <thead><tr><th>Employee</th><th>Trip</th><th>Pickup</th><th className={full}>Vehicle</th><th className={full}>Submitted</th><th>Status</th><th className="text-right">Quoted</th></tr></thead>
    <tbody>{rows.map((r) => <tr key={r.id}>
      <td><Link className="font-semibold text-red-700" href={`/corporate-admin/approvals/${r.id}`}>{r.employee.name}</Link><p className="text-xs text-neutral-500">{[r.employee.department?.name, r.employee.branch?.name].filter(Boolean).join(" · ") || r.employee.code}</p></td>
      <td>{r.ride ? <span className="block max-w-64"><span className="block truncate">{r.ride.pickupAddress}</span><span className="block truncate text-xs text-neutral-500">→ {r.ride.dropAddress}</span></span> : "—"}</td>
      <td className="whitespace-nowrap">{when(r.ride?.pickupDateTime)}</td>
      <td className={full}>{r.ride ? `${r.ride.vehicle.make} ${r.ride.vehicle.model}` : "—"}<p className="text-xs text-neutral-500">{r.ride?.vehicle.category}</p></td>
      <td className={`whitespace-nowrap ${full}`}>{when(r.submittedAt)}</td>
      <td><Status value={r.status}/>{r.status === "PENDING" && <p className="mt-1 max-w-48 truncate text-xs text-neutral-500">{r.steps.length > 1 ? `Step ${(r.steps.find((s) => s.status === "PENDING")?.level) ?? ""} of ${r.steps.length} · ` : ""}{r.steps.find((s) => s.status === "PENDING")?.assignedTo ?? ""}</p>}</td>
      <td className="whitespace-nowrap text-right font-medium">{inr(r.amount)}</td>
    </tr>)}</tbody>
  </table></div>;
}
