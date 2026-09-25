export function customerRouteInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const b = value as Record<string, unknown>;
  const fields = ["pickupCity", "dropCity", "category", "packageName"] as const;
  if (!fields.every(k => typeof b[k] === "string" && (b[k] as string).length <= 200)) return null;
  if (!["LOCAL", "OUTSTATION"].includes(String(b.serviceType)) || !["ONEWAY", "ROUNDTRIP"].includes(String(b.tripType))) return null;
  if (!String(b.pickupCity).trim() || !String(b.category).trim()) return null;
  if (b.serviceType === "LOCAL" ? !String(b.packageName).trim() : !String(b.dropCity).trim()) return null;
  if (b.fareWatch !== undefined && typeof b.fareWatch !== "boolean") return null;
  return { serviceType: String(b.serviceType), tripType: b.serviceType === "LOCAL" ? "ONEWAY" : String(b.tripType), pickupCity: String(b.pickupCity).trim(), dropCity: b.serviceType === "LOCAL" ? "" : String(b.dropCity).trim(), category: String(b.category).trim(), packageName: b.serviceType === "LOCAL" ? String(b.packageName).trim() : "", fareWatch: b.fareWatch === true };
}
