import { NextRequest, NextResponse } from "next/server";
import { reconcilePayuTransaction, PayUTransactionNotFoundError } from "@/lib/payments/payuReconcile";

// PayU's asynchronous merchant webhook. Same authoritative verify_payment
// reconciliation as the browser callback route - this is the durable path if the
// customer's browser redirect back to RideGrid is ever missed.
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let txnid = "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      txnid = String(body?.txnid || "");
    } else {
      const form = await request.formData();
      txnid = String(form.get("txnid") || "");
    }

    if (!txnid) {
      return NextResponse.json({ success: false, message: "txnid is required." }, { status: 400 });
    }

    const result = await reconcilePayuTransaction(txnid);

    return NextResponse.json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      transactionId: result.transaction.id,
      status: result.transaction.paymentStatus,
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
