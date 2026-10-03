import { NextRequest } from "next/server";
import { vendorAccess, vendorFailure, ok } from "@/lib/vendor-mobile/access";
import { readVendor } from "@/lib/vendor-mobile/read";
import { writeVendor } from "@/lib/vendor-mobile/write";
type Context = { params: Promise<{ section: string }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const a = await vendorAccess(request);
    return ok(
      await readVendor(
        request,
        (await context.params).section,
        a.vendorId,
        a.user.id,
      ),
    );
  } catch (error) {
    return vendorFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const a = await vendorAccess(request);
    return ok(await writeVendor(request, (await context.params).section, a));
  } catch (error) {
    return vendorFailure(error);
  }
}
