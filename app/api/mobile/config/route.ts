import { NextResponse } from "next/server";
import { WELLCABS } from "@/lib/website-public/brand";
import { payuReady } from "@/lib/payments/payu";
export async function GET() {
  // Retail payment is PayU only. No Cash fallback when PayU is not configured.
  const online = payuReady();
  return NextResponse.json({ success: true, data: {
    wallet: false, pushRegistration: false, cancellation: false, onlineCheckout: online,
    paymentMethods: online ? ["ONLINE"] : [], support: WELLCABS,
    termsPath: "/terms-and-conditions", privacyPath: "/privacy-policy", cancellationPath: "/cancellation-refund-policy",
  } }, { headers: { "Cache-Control": "no-store" } });
}
