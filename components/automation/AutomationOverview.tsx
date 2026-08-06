'use client';

import { Bot, Workflow } from 'lucide-react';

export default function AutomationOverview() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-lg">

      <div className="flex items-center justify-between">

        <div>

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
            <Workflow className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold">
            Automation Center
          </h1>

          <p className="mt-3 max-w-3xl text-emerald-100">
            Automate bookings, notifications, finance,
            vendors, customers, drivers and operational
            workflows across the RideGrid platform.
          </p>

        </div>

        <div className="hidden lg:flex h-24 w-24 items-center justify-center rounded-full bg-white/10">

          <Bot className="h-12 w-12" />

        </div>

      </div>

    </div>
  );
}