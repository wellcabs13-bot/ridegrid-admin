import { Suspense } from "react";
import MarketplaceResultsClient from "./MarketplaceResultsClient";

function ResultsLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
        <div className="w-full max-w-xl rounded-3xl border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <h1 className="mt-6 text-xl font-bold text-slate-900">
            Loading marketplace
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Finding available vehicles for your journey.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function MarketplaceResultsPage() {
  return (
    <Suspense fallback={<ResultsLoading />}>
      <MarketplaceResultsClient />
    </Suspense>
  );
}