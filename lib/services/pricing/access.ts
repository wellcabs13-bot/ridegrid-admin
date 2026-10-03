import { NextRequest, NextResponse } from "next/server";
import { requestPermission } from "@/lib/request-access";
import { Permission, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PricingError } from "./engine";

export async function pricingAccess(request: NextRequest, requestedVendor?: string | null) {
  const auth = await requestPermission(request, Permission.DASHBOARD_VIEW);
  if (auth.denied || !auth.user) throw new PricingError("UNAUTHORIZED", "Sign in with a pricing account", auth.denied?.status || 401);
  const user = auth.user;
  const admin = user.role === "SUPER_ADMIN" && hasPermission(user.role, Permission.SETTINGS_MANAGE);
  const finance = user.role === "FINANCE" && hasPermission(user.role, Permission.FINANCE_MANAGE);
  if (!admin && !finance && user.role !== "VENDOR") throw new PricingError("FORBIDDEN", "Pricing access denied", 403);
  let vendorId = requestedVendor || undefined;
  if (user.role === "VENDOR") {
    const vendor = await prisma.vendor.findFirst({ where: { userId: user.id, deletedAt: null }, select: { id: true } });
    if (!vendor || (vendorId && vendorId !== vendor.id)) throw new PricingError("FORBIDDEN", "You may manage only your own fares", 403);
    vendorId = vendor.id;
  }
  return { user, admin, finance, vendorId };
}
export function pricingResponse(error: unknown) {
  if (error instanceof PricingError) return NextResponse.json({ success: false, code: error.code, message: error.message }, { status: error.status });
  if (error && typeof error === "object" && "code" in error && ["P2021","P2022"].includes(String(error.code))) return NextResponse.json({ success:false,code:"PRICING_MIGRATION_REQUIRED",message:"Pricing requires the pending database migration. Apply the pricing migration before configuring or quoting fares." },{status:503});
  console.error("Pricing request failed", error);
  return NextResponse.json({ success: false, code: "PRICING_ERROR", message: "Pricing could not be completed. Please retry." }, { status: 500 });
}
