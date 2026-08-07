"use client";

import {
  ChartCard,
} from "@/components/ui/cards";

import {
  FleetChart,
} from "@/components/ui/charts";

import {
  FleetHealth,
  QuickCommand,
  LiveOperations,
  RecentBookings,
  BookingTimeline,
  AlertCenter,
} from "@/components/ui/widgets";

export default function OperationsSection() {
  return (
    <>

      {/* Fleet */}

      <div className="mt-10 grid gap-6 xl:grid-cols-3">

        <ChartCard
          title="Fleet Distribution"
          subtitle="Current Vehicle Status"
        >

          <FleetChart />

        </ChartCard>

        <FleetHealth />

        <LiveOperations />

      </div>

      {/* Commands */}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">

        <QuickCommand />

        <BookingTimeline />

      </div>

      {/* Recent */}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">

        <RecentBookings />

        <AlertCenter />

      </div>

    </>
  );
}