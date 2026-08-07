"use client";

import {
  InfoCard,
} from "@/components/ui/cards";

export default function BusinessOverview() {
  return (
    <div className="mt-10 grid gap-6 xl:grid-cols-2">

      <InfoCard title="Business Overview">

        <div className="space-y-5">

          <Row
            title="Total Customers"
            value="18,245"
          />

          <Row
            title="Vendor Partners"
            value="148"
          />

          <Row
            title="Corporate Accounts"
            value="326"
          />

          <Row
            title="Completed Trips"
            value="1,25,820"
          />

          <Row
            title="Customer Rating"
            value="⭐ 4.9 / 5"
          />

          <Row
            title="Cancellation Rate"
            value="1.8%"
          />

        </div>

      </InfoCard>

      <div className="space-y-6">

        <InfoCard title="Finance Summary">

          <div className="space-y-4">

            <Row
              title="Today's Collection"
              value="₹1,84,500"
              color="text-emerald-600"
            />

            <Row
              title="Vendor Payables"
              value="₹72,400"
              color="text-orange-600"
            />

            <Row
              title="Outstanding Amount"
              value="₹18,200"
              color="text-red-600"
            />

            <Row
              title="Net Profit Today"
              value="₹64,850"
              color="text-blue-600"
            />

          </div>

        </InfoCard>

        <InfoCard title="AI Business Advisor">

          <div className="space-y-4">

            <Advice
              color="bg-emerald-50"
              text="📈 Revenue expected to grow 16% today."
            />

            <Advice
              color="bg-blue-50"
              text="🚖 Pune Airport demand is increasing."
            />

            <Advice
              color="bg-orange-50"
              text="⚠ 6 vehicles require maintenance this week."
            />

            <Advice
              color="bg-violet-50"
              text="🏢 Corporate bookings increased by 11%."
            />

          </div>

        </InfoCard>

      </div>

    </div>
  );
}

function Row({
  title,
  value,
  color = "",
}: {
  title: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-slate-600">
        {title}
      </span>

      <strong className={color}>
        {value}
      </strong>

    </div>
  );
}

function Advice({
  color,
  text,
}: {
  color: string;
  text: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>

      <p className="font-semibold">

        {text}

      </p>

    </div>
  );
}