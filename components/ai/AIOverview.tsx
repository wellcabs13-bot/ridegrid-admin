'use client';

import { Brain, Sparkles } from 'lucide-react';

export default function AIOverview() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8 text-white shadow-lg">
      <div className="flex items-center justify-between">

        <div>

          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <Brain className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold">
            RideGrid AI Center
          </h1>

          <p className="mt-3 max-w-3xl text-blue-100">
            Enterprise Artificial Intelligence powering bookings,
            vendors, customers, pricing, fraud detection,
            analytics and business automation.
          </p>

        </div>

        <div className="hidden lg:flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
          <Sparkles className="h-12 w-12" />
        </div>

      </div>
    </div>
  );
}