import { Suspense } from "react";
import MarketplaceResultsClient from "./MarketplaceResultsClient";

function MarketplaceResultsLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-900">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-red-600" />
        <p className="mt-4 text-sm font-semibold text-neutral-600">
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
