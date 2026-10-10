import { NextResponse } from "next/server";
import { payuReady } from "@/lib/payments/payu";

// Public readiness flag for the retail checkout. Exposes no configuration values.
export async function GET() {
  return NextResponse.json({ success: true, data: { online: payuReady(), provider: "PAYU" } }, { headers: { "Cache-Control": "no-store" } });
}
