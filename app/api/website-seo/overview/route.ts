import { NextRequest, NextResponse } from "next/server";
import { staffAccess, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { siteOverview } from "@/lib/website-seo/admin-overview";

// Protected by middleware.ts (Super Admin) and re-checked here.
export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    const data = await siteOverview({ type: p.get("type") || undefined, status: p.get("status") || undefined, q: p.get("q") || undefined, page: Number(p.get("page")) || 1 });
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("GET /api/website-seo/overview failed", error);
    return NextResponse.json({ success: false, message: "Unable to load website pages." }, { status: 500 });
  }
}
