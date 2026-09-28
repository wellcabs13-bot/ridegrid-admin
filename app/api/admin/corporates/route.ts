import { NextRequest } from "next/server";
import { fail, intParam, ok, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { createCorporate, listCorporates } from "@/lib/services/admin/CorporateAdminService";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    return ok(await listCorporates({ q: p.get("q")?.trim() || undefined, status: p.get("status") || undefined, page: intParam(p.get("page"), 1), pageSize: intParam(p.get("pageSize"), 25) }));
  } catch (error) {
    return fail(error, "GET /api/admin/corporates");
  }
}

// Onboard a company with its primary Corporate Admin and Corporate Credit account.
export async function POST(request: NextRequest) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const b = await request.json();
    const admin = (b.admin ?? {}) as Record<string, unknown>;
    return ok(await createCorporate({
      companyName: str(b.companyName, 160), legalName: str(b.legalName, 160), gstNumber: str(b.gstNumber, 20), email: str(b.email, 200), mobile: str(b.mobile, 20),
      address: str(b.address, 300), city: str(b.city, 80), state: str(b.state, 80), pincode: str(b.pincode, 10), billingCycle: str(b.billingCycle, 20) || undefined,
      creditLimit: b.creditLimit === "" || b.creditLimit == null ? 0 : Number(b.creditLimit), paymentTermsDays: b.paymentTermsDays == null || b.paymentTermsDays === "" ? undefined : Number(b.paymentTermsDays),
      requireApproval: b.requireApproval === true,
      admin: { name: str(admin.name, 120), email: str(admin.email, 200), mobile: str(admin.mobile, 20), designation: str(admin.designation, 80) },
    }, user!.id));
  } catch (error) {
    return fail(error, "POST /api/admin/corporates");
  }
}
