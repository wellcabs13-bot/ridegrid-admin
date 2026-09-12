import { Suspense } from "react";

import MarketplaceSearchClient from "./MarketplaceSearchClient";

function MarketplaceLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="h-4 w-44 animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-9 w-80 max-w-full animate-pulse rounded bg-slate-800" />
          <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-slate-800" />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="py-16 text-center text-slate-300">
            Loading RideGrid Marketplace...
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<MarketplaceLoading />}>
      <MarketplaceSearchClient />
    </Suspense>
  );
}
