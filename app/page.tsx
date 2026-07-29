import DashboardLayout from "../components/DashboardLayout";
import DashboardCard from "../components/DashboardCard";

import {
  CalendarDays,
  Car,
  Users,
  Wallet,
  Activity,
  CircleCheck,
  Clock3,
  AlertTriangle,
} from "lucide-react";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              RideGrid Dashboard
            </h1>

            <p className="mt-2 text-slate-500">
              Welcome back. Here's what's happening across your business today.
            </p>
          </div>

          <button className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700">
            + New Booking
          </button>

        </div>

        {/* KPI Cards */}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">

          <DashboardCard
            title="Today's Bookings"
            value="128"
            icon={<CalendarDays size={32} />}
            change="+12%"
            color="bg-blue-500"
          />

          <DashboardCard
            title="Running Trips"
            value="46"
            icon={<Car size={32} />}
            change="+5%"
            color="bg-green-500"
          />

          <DashboardCard
            title="Active Drivers"
            value="214"
            icon={<Users size={32} />}
            change="+8%"
            color="bg-orange-500"
          />

          <DashboardCard
            title="Today's Revenue"
            value="₹1,84,500"
            icon={<Wallet size={32} />}
            change="+18%"
            color="bg-purple-500"
          />

        </div>

        {/* Middle Section */}

        <div className="grid gap-6 xl:grid-cols-3">

          {/* Revenue */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">

            <div className="mb-6 flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Revenue Overview
              </h2>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                +18%
              </span>

            </div>

            <div className="flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">

              <div className="text-center">

                <Activity
                  size={50}
                  className="mx-auto text-blue-600"
                />

                <p className="mt-4 font-semibold text-slate-700">
                  Revenue Chart
                </p>

                <p className="text-sm text-slate-500">
                  Recharts will be integrated here.
                </p>

              </div>

            </div>

          </div>

          {/* Fleet Status */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Fleet Status
            </h2>

            <div className="space-y-5">

              <div className="flex items-center justify-between">

                <span>Total Vehicles</span>

                <strong>426</strong>

              </div>

              <div className="flex items-center justify-between">

                <span>Available</span>

                <span className="font-semibold text-emerald-600">
                  286
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span>Running</span>

                <span className="font-semibold text-blue-600">
                  118
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span>Maintenance</span>

                <span className="font-semibold text-orange-600">
                  22
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* Bottom */}

        <div className="grid gap-6 xl:grid-cols-2">

          {/* Recent Bookings */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              Recent Bookings
            </h2>

            <div className="space-y-4">

              {[
                ["RG100245", "Completed", "green"],
                ["RG100246", "Running", "blue"],
                ["RG100247", "Pending", "orange"],
                ["RG100248", "Cancelled", "red"],
              ].map(([id, status, color]) => (

                <div
                  key={id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
                >

                  <div>

                    <p className="font-semibold">
                      {id}
                    </p>

                    <p className="text-sm text-slate-500">
                      Mumbai Airport Transfer
                    </p>

                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold
                    ${
                      color === "green"
                        ? "bg-emerald-100 text-emerald-700"
                        : color === "blue"
                        ? "bg-blue-100 text-blue-700"
                        : color === "orange"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {status}
                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* System Health */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-6 text-xl font-bold">
              System Health
            </h2>

            <div className="space-y-5">

              <Status
                icon={<CircleCheck className="text-emerald-600" />}
                title="Server"
                value="Online"
              />

              <Status
                icon={<CircleCheck className="text-emerald-600" />}
                title="Database"
                value="Healthy"
              />

              <Status
                icon={<Clock3 className="text-orange-500" />}
                title="Payment Gateway"
                value="Syncing"
              />

              <Status
                icon={<AlertTriangle className="text-yellow-500" />}
                title="SMS Gateway"
                value="Warning"
              />

            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

function Status({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

      <div className="flex items-center gap-3">

        {icon}

        <span className="font-medium">
          {title}
        </span>

      </div>

      <strong>{value}</strong>

    </div>
  );
}