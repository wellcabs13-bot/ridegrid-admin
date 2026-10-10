// Critical mutations (quote, booking, approval) require a confirmed server response.
export function assertOnline(online: boolean) {
  if (!online) throw new Error("You are offline. Reconnect before continuing.");
}
// Only these display fields may be persisted. Addresses, fares, contacts, approval
// notes and notification bodies never enter the on-device cache.
export function safeRows(rows: Record<string, unknown>[]) {
  const fields = ["id", "bookingNumber", "status", "pickupDateTime", "service"];
  return rows.map((row) => Object.fromEntries(fields.filter((key) => key in row).map((key) => [key, row[key]])));
}
