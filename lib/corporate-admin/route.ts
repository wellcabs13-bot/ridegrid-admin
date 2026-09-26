import { NextRequest } from "next/server";
import { corporateAdminAccess, CorporateAdminError, failure, ok } from "./access";
import { readAdmin } from "./read";
import { writeAdmin } from "./write";

export async function adminGet(request: NextRequest, section: string) {
  try { return ok(await readAdmin(request, section, await corporateAdminAccess(request))); } catch (e) { return failure(e); }
}

export async function adminPost(request: NextRequest, section: string) {
  try {
    const a = await corporateAdminAccess(request);
    const b = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new CorporateAdminError(400, "Invalid request.");
    return ok(await writeAdmin(section, b, a));
  } catch (e) { return failure(e); }
}
