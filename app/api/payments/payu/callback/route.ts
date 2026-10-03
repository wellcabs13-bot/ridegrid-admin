import { NextRequest, NextResponse } from "next/server";
import { payuConfig, verifyResponseHash } from "@/lib/payments/payu";
import { reconcilePayuTransaction, PayUTransactionNotFoundError } from "@/lib/payments/payuReconcile";

// PayU's surl/furl hit this route with the same form fields regardless of outcome.
// Authenticity is checked twice before we act on anything: the merchant key must be
// ours, and the reverse hash (including the udf1 value actually sent) must verify -
// this is the gate that stops anyone but PayU from triggering a verify_payment lookup
// or reconciliation for an arbitrary txnid. The actual paid/failed state, though,
// always comes from reconcilePayuTransaction's own server-to-server verify call, never
// from these posted fields.
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;

  try {
    const form = await request.formData();
    const txnid = String(form.get("txnid") || "");
    const udf1 = String(form.get("udf1") || "web");

    if (!txnid) {
      return NextResponse.redirect(`${origin}/marketplace/payment/status?error=missing_txnid`, 303);
    }

    const postedKey = String(form.get("key") || "");
    if (postedKey !== payuConfig().key) {
      console.error("PAYU CALLBACK: merchant key mismatch", { txnid });
      return NextResponse.redirect(`${origin}/marketplace/payment/status?error=invalid_source`, 303);
    }

    const hashValid = verifyResponseHash({
      status: String(form.get("status") || ""),
      txnid,
      amount: String(form.get("amount") || ""),
      productinfo: String(form.get("productinfo") || ""),
      firstname: String(form.get("firstname") || ""),
      email: String(form.get("email") || ""),
      udf1: String(form.get("udf1") || ""),
      hash: String(form.get("hash") || ""),
    });

    if (!hashValid) {
      console.error("PAYU CALLBACK: response hash mismatch", { txnid });
      return NextResponse.redirect(`${origin}/marketplace/payment/status?error=invalid_source`, 303);
    }

    const result = await reconcilePayuTransaction(txnid);
    const query = `bookingId=${encodeURIComponent(result.bookingId || "")}&bookingNumber=${encodeURIComponent(result.bookingNumber || "")}`;

    if (udf1 === "mobile") {
      return NextResponse.redirect(`ridegrid://payment-return?${query}`, 303);
    }

    return NextResponse.redirect(`${origin}/marketplace/payment/status?${query}`, 303);
  } catch (error) {
    if (error instanceof PayUTransactionNotFoundError) {
      return NextResponse.redirect(`${origin}/marketplace/payment/status?error=not_found`, 303);
    }
    console.error("PAYU CALLBACK ERROR:", error);
    return NextResponse.redirect(`${origin}/marketplace/payment/status?error=verify_failed`, 303);
  }
}
