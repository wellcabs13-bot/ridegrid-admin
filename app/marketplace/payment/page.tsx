import { Suspense } from "react";
import MarketplacePaymentClient from "./MarketplacePaymentClient";

function PaymentLoading() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
        <p className="mt-4 font-bold text-slate-700">Loading payment</p>
      </div>
    </main>
  );
}

export default function MarketplacePaymentPage() {
  return (
    <Suspense fallback={<PaymentLoading />}>
      <MarketplacePaymentClient />
    </Suspense>
  );
}
