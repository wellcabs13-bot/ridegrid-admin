export function assertOnline(online: boolean) {
  if (!online)
    throw new Error("You are offline. Reconnect before saving changes.");
}
// Only these display fields may be persisted. Addresses, names, contact details,
// fares, licences, documents, banking and notification bodies never enter disk cache.
export function safeRows(section: string, rows: Record<string, unknown>[]) {
  const fields =
    section === "bookings"
      ? ["id", "bookingNumber", "status", "pickupDateTime", "tripType"]
      : section === "fleet"
        ? ["id", "registrationNumber", "make", "model", "category", "status"]
        : ["id", "status"];
  return rows.map((row) =>
    Object.fromEntries(
      fields.filter((key) => key in row).map((key) => [key, row[key]]),
    ),
  );
}
