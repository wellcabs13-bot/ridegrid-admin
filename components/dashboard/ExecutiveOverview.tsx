"use client";

import {
  CalendarPlus,
  Wallet,
  Users,
  Car,
} from "lucide-react";

import { StatCard } from "@/components/ui/cards";

export default function ExecutiveOverview() {
  return (
    <>
      <div className="mt-10">

        <h2 className="text-3xl font-bold text-slate-900">
          Executive Overview
        </h2>

        <p className="mt-2 text-slate-500">
          Live operational statistics across RideGrid
        </p>

      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Today's Revenue"
          value="₹1,84,500"
          icon={<Wallet size={32} />}
          trend="+18%"
          trendType="up"
          color="green"
        />

        <StatCard
          title="Today's Bookings"
          value="128"
          icon={<CalendarPlus size={32} />}
          trend="+12%"
          trendType="up"
          color="blue"
        />

        <StatCard
          title="Active Drivers"
          value="214"
          icon={<Users size={32} />}
          trend="+8%"
          trendType="up"
          color="purple"
        />

        <StatCard
          title="Fleet Available"
          value="426"
          icon={<Car size={32} />}
          trend="+5%"
          trendType="up"
          color="orange"
        />

      </div>
    </>
  );
}