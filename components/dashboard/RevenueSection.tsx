"use client";

import {
  ChartCard,
} from "@/components/ui/cards";

import {
  RevenueChart,
} from "@/components/ui/charts";

import {
  AIInsight,
} from "@/components/ui/widgets";

export default function RevenueSection() {
  return (

    <div className="mt-10 grid gap-6 xl:grid-cols-3">

      <ChartCard
        title="Revenue Intelligence"
        subtitle="Business Growth • Last 6 Months"
        className="xl:col-span-2"
      >

        <RevenueChart />

      </ChartCard>

      <AIInsight />

    </div>

  );
}