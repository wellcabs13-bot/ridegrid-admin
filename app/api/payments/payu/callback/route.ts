import { NextRequest, NextResponse } from "next/server";
import { verifyResponseHash } from "@/lib/payments/payu";
import { reconcilePayuTransaction, PayUTransactionNotFoundError } from "@/lib/payments/payuReconcile";

// PayU's surl/furl hit this route with the same form fields regardless of outcome.
// The posted `status`/`hash` fields are logged for audit but the actual paid/failed
// state always comes from reconcilePayuTransaction's server-to-server verify call.
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;

  try {
    const form = await request.formData();
    const txnid = String(form.get("txnid") || "");
    const udf1 = String(form.get("udf1") || "web");

    if (!txnid) {
      return NextResponse.redirect(`${origin}/marketplace/payment/status?error=missing_txnid`, 303);
    }

    const hashValid = verifyResponseHash({
      status: String(form.get("status") || ""),
      txnid,
      amount: String(form.get("amount") || ""),
      productinfo: String(form.get("productinfo") || ""),
      firstname: String(form.get("firstname") || ""),
      email: String(form.get("email") || ""),
      hash: String(form.get("hash") || ""),
    });

    if (!hashValid) {
      console.error("PAYU CALLBACK: response hash mismatch", { txnid });
    }

    const result = await reconcilePayuTransaction(txnid);
    const bookingId = result.booking?.id || "";
    const bookingNumber = result.booking?.bookingNumber || "";
    const query = `bookingId=${encodeURIComponent(bookingId)}&bookingNumber=${encodeURIComponent(bookingNumber)}`;

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
