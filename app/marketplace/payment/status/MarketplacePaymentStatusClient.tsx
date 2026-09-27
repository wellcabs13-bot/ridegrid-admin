"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusData = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED" | null;
  paymentMethod: string | null;
  gatewayName: string | null;
  amount: number | null;
};

function currency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const POLL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes before treating an unresolved payment as expired

export default function MarketplacePaymentStatusClient() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get("bookingId") || "";
  const bookingNumber = params.get("bookingNumber") || "";
  const initError = params.get("error") || "";

  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(initError ? "We could not confirm your payment. Please check its status below." : "");
  const [expired, setExpired] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const pollCount = useRef(0);

  const fetchStatus = useCallback(async () => {
    if (!bookingId) return;
    try {
      const query = new URLSearchParams({ bookingId });
      if (bookingNumber) query.set("bookingNumber", bookingNumber);
      const response = await fetch(`/api/payments/status?${query.toString()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to fetch payment status.");
      setData(result.data as StatusData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to fetch payment status.");
    }
  }, [bookingId, bookingNumber]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!data || data.paymentStatus === "PAID" || data.paymentStatus === "FAILED") return;
    const id = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current >= MAX_POLLS) {
        setExpired(true);
        clearInterval(id);
        return;
      }
      void fetchStatus();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [data, fetchStatus]);

  async function retryPayment() {
    if (!bookingId) return;
    try {
      setRetrying(true);
      setError("");
      const response = await fetch("/api/payments/payu/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, bookingNumber, platform: "web" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.payuCheckoutUrl) {
        throw new Error(result.message || "Unable to retry payment.");
      }
      window.location.href = result.data.payuCheckoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to retry payment.");
      setRetrying(false);
    }
  }

  if (!bookingId) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Payment status unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">No booking reference was provided.</p>
          <button onClick={() => router.push("/marketplace")} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-black text-white">
            Back to Marketplace
          </button>
        </div>
      </main>
    );
  }

  const paid = data?.paymentStatus === "PAID";
  const failed = data?.paymentStatus === "FAILED" || (!!error && !data);
  const processing = !paid && !failed && !expired;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">RideGrid Payment</p>

        {paid && (
          <>
            <h1 className="mt-3 text-2xl font-black text-emerald-600">Booking confirmed</h1>
            <p className="mt-2 text-sm text-slate-500">Your payment was received successfully.</p>
          </>
        )}

        {expired && !paid && (
          <>
            <h1 className="mt-3 text-2xl font-black text-amber-600">Payment expired</h1>
            <p className="mt-2 text-sm text-slate-500">We did not receive a confirmation in time.</p>
          </>
        )}

        {failed && !expired && (
          <>
            <h1 className="mt-3 text-2xl font-black text-red-600">Payment failed</h1>
            <p className="mt-2 text-sm text-slate-500">Your payment could not be completed.</p>
          </>
        )}

        {processing && !expired && (
          <>
            <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
            <h1 className="mt-4 text-2xl font-black text-slate-900">Processing payment</h1>
            <p className="mt-2 text-sm text-slate-500">This usually takes a few seconds.</p>
          </>
        )}

        {data && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Booking</span><span className="font-bold text-slate-800">{data.bookingNumber}</span></div>
            {data.amount != null && <div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Amount</span><span className="font-bold text-slate-800">{currency(data.amount)}</span></div>}
          </div>
        )}

        {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}

        {(failed || expired) && !paid && (
          <button
            type="button"
            disabled={retrying}
            onClick={retryPayment}
            className="mt-6 w-full rounded-2xl bg-cyan-500 px-5 py-4 font-black text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? "Redirecting to PayU..." : "Retry payment"}
          </button>
        )}

        {paid && (
          <button
            type="button"
            onClick={() => router.push(`/marketplace/booking/success?bookingId=${encodeURIComponent(bookingId)}&bookingNumber=${encodeURIComponent(data?.bookingNumber || bookingNumber)}`)}
            className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-4 font-black text-white"
          >
            View booking
          </button>
        )}
      </div>
    </main>
  );
}
