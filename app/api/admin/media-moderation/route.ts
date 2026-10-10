import { NextRequest, NextResponse } from "next/server";
import { fail, ok, OPERATIONS_STAFF, staffAccess } from "@/lib/admin-api";
import { MediaModerationError, setMediaQuarantine } from "@/lib/services/vehicle/VehicleMediaModeration";

// Withdraws (or restores) a mis-uploaded listing photo from public view. Audited; never deletes the file.
export async function POST(request: NextRequest) {
  const { user, denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    const b = await request.json();
    if (typeof b?.fileAssetId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(b.fileAssetId) || !["QUARANTINE", "RESTORE"].includes(b.action))
      return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
    return ok(await setMediaQuarantine({ fileAssetId: b.fileAssetId, quarantined: b.action === "QUARANTINE", reason: typeof b.reason === "string" ? b.reason : "", actorId: user!.id }));
  } catch (error) {
    if (error instanceof MediaModerationError) return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    return fail(error, "POST /api/admin/media-moderation");
  }
}
