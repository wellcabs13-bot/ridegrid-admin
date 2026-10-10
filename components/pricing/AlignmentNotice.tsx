import type { AlignmentIssue } from "@/lib/services/pricing/alignment";

const label = (v: string) => v.toLowerCase().replace(/_/g, " ");

/** Explains why a car with approved fares is not appearing in the marketplace. Display only; never changes a fare. */
export default function AlignmentNotice({ issues }: { issues?: AlignmentIssue[] }) {
  if (!issues?.length) return null;
  return <section role="alert" aria-label="Fares that cannot be sold" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
    <h2 className="font-semibold">{issues.length === 1 ? "1 car has approved fares that cannot be sold" : `${issues.length} cars have approved fares that cannot be sold`}</h2>
    <p className="mt-1 text-sm">Fares are approved for one exact car and driver. When a car's driver changes, those fares stop matching and the car is hidden from customers until this is fixed. Nothing has been changed automatically.</p>
    <ul className="mt-3 space-y-3 text-sm">{issues.map(i => <li key={`${i.vehicleId}-${i.pinnedDriverId}`} className="rounded border border-amber-200 bg-white/70 p-3">
      <strong>{i.registrationNumber || i.vehicleId}</strong>: {i.rateVersionIds.length} approved fare{i.rateVersionIds.length === 1 ? "" : "s"} ({i.services.map(label).join(", ")}) {i.reason === "NO_DRIVER" ? "need a driver assigned" : `were approved for ${i.pinnedDriverName || "a different driver"}`}.
      <div className="mt-1">{i.action}</div></li>)}</ul>
  </section>;
}
