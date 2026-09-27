import { NextResponse } from "next/server";
import { WELLCABS } from "@/lib/website-public/brand";
export async function GET() {
  return NextResponse.json({ success: true, data: {
    wallet: false, pushRegistration: false, cancellation: false, onlineCheckout: true,
    paymentMethods: ["CASH", "ONLINE"], support: WELLCABS,
    termsPath: "/terms-and-conditions", privacyPath: "/privacy-policy", cancellationPath: "/cancellation-refund-policy",
  } });
}
