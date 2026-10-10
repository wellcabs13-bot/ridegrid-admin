import { NextResponse } from "next/server";
import { WELLCABS } from "@/lib/website-public/brand";
import { payuReady } from "@/lib/payments/payu";
import { pushReady } from "@/lib/notifications/channels";
import { AIRPORT_CITIES } from "@/lib/website-public/marketplace";
export async function GET() {
  // Retail payment is PayU only. No Cash fallback when PayU is not configured.
  const online = payuReady();
  return NextResponse.json({ success: true, data: {
    // Apps ask for notification permission and register only when push is configured.
    wallet: false, pushRegistration: pushReady(), cancellation: false, onlineCheckout: online,
    paymentMethods: online ? ["ONLINE"] : [], support: WELLCABS,
    // Airport transfers are searched live; these cities only enable the search.
    airportCities: AIRPORT_CITIES,
    termsPath: "/terms-and-conditions", privacyPath: "/privacy-policy", cancellationPath: "/cancellation-refund-policy",
    accountDeletionPath: "/account-deletion",
  } }, { headers: { "Cache-Control": "no-store" } });
}
