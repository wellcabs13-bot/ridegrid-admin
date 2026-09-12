import { Suspense } from "react";
import MarketplaceResultsClient from "./MarketplaceResultsClient";

function MarketplaceResultsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-cyan-400" />
        <p className="mt-4 text-sm font-semibold text-slate-300">
          Loading available vehicles...
        </p>
      </div>
    </main>
  );
}

export default function MarketplaceResultsPage() {
  return (
    <Suspense fallback={<MarketplaceResultsLoading />}>
      <MarketplaceResultsClient />
    </Suspense>
  );
}
