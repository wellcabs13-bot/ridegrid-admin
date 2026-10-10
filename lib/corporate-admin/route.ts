import { NextRequest } from "next/server";
import { corporateAdminAccess, CorporateAdminError, failure, ok } from "./access";
import { adminBookingRead, adminBookingWrite, isAdminBookingReadSection, isAdminBookingWriteSection } from "./booking";
import { readAdmin } from "./read";
import { writeAdmin } from "./write";

export async function adminGet(request: NextRequest, section: string) {
  try {
    const a = await corporateAdminAccess(request);
    if (isAdminBookingReadSection(section)) return ok(await adminBookingRead(request, section, a));
    return ok(await readAdmin(request, section, a));
  } catch (e) { return failure(e); }
}

export async function adminPost(request: NextRequest, section: string) {
  try {
    const a = await corporateAdminAccess(request);
    const b = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new CorporateAdminError(400, "Invalid request.");
    if (isAdminBookingWriteSection(section)) return ok(await adminBookingWrite(section, b, a));
    return ok(await writeAdmin(section, b, a));
  } catch (e) { return failure(e); }
}
