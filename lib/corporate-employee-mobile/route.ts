import { NextRequest } from "next/server";
import { corporateEmployeeAccess, CorporateMobileError, failure, ok } from "./access";
import { readEmployee } from "./read";
import { writeEmployee } from "./write";

export async function employeeGet(request: NextRequest, section: string) {
  try { return ok(await readEmployee(request, section, await corporateEmployeeAccess(request))); } catch (e) { return failure(e); }
}
export async function employeePost(request: NextRequest, section: string) {
  try {
    const a = await corporateEmployeeAccess(request);
    const b = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new CorporateMobileError(400, "Invalid request.");
    return ok(await writeEmployee(section, b, a));
  } catch (e) { return failure(e); }
}
