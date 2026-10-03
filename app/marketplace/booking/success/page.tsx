import { Suspense } from "react";
import MarketplaceBookingSuccessClient from "./MarketplaceBookingSuccessClient";

function BookingSuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="mt-4 text-sm font-semibold text-slate-600">
          Loading booking confirmation...
        </p>
      </div>
    </div>
  );
}

export default function MarketplaceBookingSuccessPage() {
  return (
    <Suspense fallback={<BookingSuccessFallback />}>
      <MarketplaceBookingSuccessClient />
    </Suspense>
  );
}