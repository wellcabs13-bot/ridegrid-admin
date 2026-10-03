import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/request-access";
import { vendorAccess, VendorError } from "./access";

// Preserve central-dashboard query parameters while binding vendor requests to
// their own identity. This also protects the older vendor web dashboard.
export async function legacyVendorId(
  request: NextRequest,
  requestedVendorId?: string,
) {
  const user = await requestUser(request);
  if (!user) throw new VendorError(401, "Please sign in.");
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    ((origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    throw new VendorError(403, "Cross-site changes are not allowed.");
  if (user.role === "VENDOR") return (await vendorAccess(request)).vendorId;
  if (!["SUPER_ADMIN", "OPERATIONS", "FINANCE"].includes(user.role))
    throw new VendorError(403, "Access denied.");
  return requestedVendorId || request.nextUrl.searchParams.get("vendorId");
}

// Old general CRUD handlers were written for the central dashboard and accept
// administrative fields. Vendor mutations use the allowlisted mobile adapter.
export async function centralFleetAccess(
  request: NextRequest,
  kind: "fleet" | "drivers",
  id?: string,
) {
  const user = await requestUser(request);
  if (!user)
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    ((origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return NextResponse.json({ success: false }, { status: 403 });
  if (
    user.role === "SUPER_ADMIN" ||
    (user.role === "OPERATIONS" && request.method === "GET")
  )
    return null;
  if (user.role !== "VENDOR" || request.method !== "GET")
    return NextResponse.json(
      { success: false, message: "Use your permitted vendor workflow." },
      { status: 403 },
    );
  // Return the mobile-safe projection for vendor callers of legacy endpoints.
  const { readVendor } = await import("./read");
  const a = await vendorAccess(request);
  const url = new URL(request.url);
  if (id) url.searchParams.set("id", id);
  const data = await readVendor(
    new NextRequest(url, { headers: request.headers }),
    kind,
    a.vendorId,
    a.user.id,
  );
  return NextResponse.json({ success: true, data });
}
