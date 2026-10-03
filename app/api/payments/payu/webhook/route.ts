import { NextRequest, NextResponse } from "next/server";
import { payuConfig, verifyResponseHash } from "@/lib/payments/payu";
import { reconcilePayuTransaction, PayUTransactionNotFoundError } from "@/lib/payments/payuReconcile";

function field(source: URLSearchParams | Record<string, unknown>, name: string) {
  if (source instanceof URLSearchParams) return source.get(name) || "";
  const value = source[name];
  return typeof value === "string" ? value : value != null ? String(value) : "";
}

// PayU's asynchronous merchant webhook (server-to-server). This is the durable
// reconciliation path if the customer's browser is ever closed before the surl/furl
// redirect completes. Authenticity is required before acting on anything: the posted
// merchant key must be ours and the reverse hash (with the real udf1 value) must
// verify - we never trust txnid + verify_payment alone without first proving the
// request actually came from PayU, since that alone would let anyone force this
// endpoint into calling PayU's verify API for a guessed/enumerated txnid.
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const raw: Record<string, unknown> = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const txnid = field(raw, "txnid");
    const udf1 = field(raw, "udf1");

    if (!txnid) {
      return NextResponse.json({ success: false, message: "txnid is required." }, { status: 400 });
    }

    const postedKey = field(raw, "key");
    if (postedKey !== payuConfig().key) {
      console.error("PAYU WEBHOOK: merchant key mismatch", { txnid });
      return NextResponse.json({ success: false, message: "Invalid source." }, { status: 400 });
    }

    const hashValid = verifyResponseHash({
      status: field(raw, "status"),
      txnid,
      amount: field(raw, "amount"),
      productinfo: field(raw, "productinfo"),
      firstname: field(raw, "firstname"),
      email: field(raw, "email"),
      udf1,
      hash: field(raw, "hash"),
    });

    if (!hashValid) {
      console.error("PAYU WEBHOOK: response hash mismatch", { txnid });
      return NextResponse.json({ success: false, message: "Invalid source." }, { status: 400 });
    }

    const result = await reconcilePayuTransaction(txnid);

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      transactionId: result.transactionId,
      status: result.paymentStatus,
      bookingStatus: result.bookingStatus,
    });
  } catch (error) {
    if (error instanceof PayUTransactionNotFoundError) {
      return NextResponse.json({ success: false, message: "Transaction not found." }, { status: 404 });
    }
    console.error("PAYU WEBHOOK ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Webhook processing failed." },
      { status: 500 }
    );
  }
}
