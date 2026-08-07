import DashboardLayout from "@/components/DashboardLayout";

import {
  CalendarPlus,
  Car,
  Users,
  Wallet,
  TrendingUp,
  Activity,
  Bell,
  Shield,
  Building2,
  ArrowUpRight,
  Clock3,
} from "lucide-react";

import {
  PageContainer,
} from "@/components/ui/page";

import {
  StatCard,
  ChartCard,
  InfoCard,
} from "@/components/ui/cards";

import {
  RevenueChart,
  FleetChart,
} from "@/components/ui/charts";

import {
  AIInsight,
  FleetHealth,
  RecentBookings,
  LiveOperations,
  BookingTimeline,
  AlertCenter,
  QuickCommand,
} from "@/components/ui/widgets";

export default function Home() {
  return (
    <DashboardLayout>

      <PageContainer>

        {/* ===========================
            HERO SECTION
        ============================ */}

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-10 text-white shadow-2xl">

          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10">

            <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

              {/* LEFT */}

              <div className="max-w-3xl">

                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm backdrop-blur">

                  🚀 RideGrid Enterprise Command Center

                </span>

                <h1 className="mt-8 text-5xl font-black leading-tight">

                  Welcome Back,
                  <br />

                  Administrator

                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">

                  Monitor every booking, vehicle, driver,
                  vendor, finance transaction and customer
                  from one intelligent enterprise platform.

                </p>

                <div className="mt-10 flex flex-wrap gap-4">

                  <button className="rounded-xl bg-white px-7 py-3 font-semibold text-slate-900 transition hover:scale-105">

                    + New Booking

                  </button>

                  <button className="rounded-xl border border-white/20 bg-white/10 px-7 py-3 backdrop-blur transition hover:bg-white/20">

                    View Reports

                  </button>

                </div>

              </div>

              {/* RIGHT */}

              <div className="grid grid-cols-2 gap-5">

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">

                  <Activity className="mb-5" />

                  <p className="text-sm text-slate-300">

                    Running Trips

                  </p>

                  <h2 className="mt-3 text-5xl font-bold">

                    118

                  </h2>

                  <p className="mt-2 text-emerald-300">

                    +8% Today

                  </p>

                </div>

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">

                  <Wallet className="mb-5" />

                  <p className="text-sm text-slate-300">

                    Today's Revenue

                  </p>

                  <h2 className="mt-3 text-5xl font-bold">

                    ₹18.4L

                  </h2>

                  <p className="mt-2 text-emerald-300">

                    +18%

                  </p>

                </div>

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">

                  <Users className="mb-5" />

                  <p className="text-sm text-slate-300">

                    Active Drivers

                  </p>

                  <h2 className="mt-3 text-5xl font-bold">

                    214

                  </h2>

                  <p className="mt-2 text-blue-300">

                    Online

                  </p>

                </div>

                <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">

                  <Car className="mb-5" />

                  <p className="text-sm text-slate-300">

                    Fleet Size

                  </p>

                  <h2 className="mt-3 text-5xl font-bold">

                    426

                  </h2>

                  <p className="mt-2 text-cyan-300">

                    Available

                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ===========================
            EXECUTIVE OVERVIEW
        ============================ */}

        <div className="mt-10 flex items-center justify-between">

          <div>

            <h2 className="text-3xl font-bold text-slate-900">

              Executive Overview

            </h2>

            <p className="mt-2 text-slate-500">

              Live operational statistics across RideGrid

            </p>

          </div>

        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">          <StatCard
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

        {/* ===========================
            BUSINESS SUMMARY
        ============================ */}

        <div className="mt-10 grid gap-6 lg:grid-cols-4">

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <TrendingUp className="text-emerald-600" />

              <ArrowUpRight className="text-emerald-600" />

            </div>

            <h3 className="mt-6 text-3xl font-bold">

              ₹3.42 Cr

            </h3>

            <p className="mt-2 text-slate-500">

              Monthly Revenue

            </p>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <Building2 className="text-blue-600" />

              <ArrowUpRight className="text-blue-600" />

            </div>

            <h3 className="mt-6 text-3xl font-bold">

              326

            </h3>

            <p className="mt-2 text-slate-500">

              Corporate Clients

            </p>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <Bell className="text-orange-500" />

              <Clock3 className="text-orange-500" />

            </div>

            <h3 className="mt-6 text-3xl font-bold">

              18

            </h3>

            <p className="mt-2 text-slate-500">

              Pending Alerts

            </p>

          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center justify-between">

              <Shield className="text-cyan-600" />

              <ArrowUpRight className="text-cyan-600" />

            </div>

            <h3 className="mt-6 text-3xl font-bold">

              99.98%

            </h3>

            <p className="mt-2 text-slate-500">

              System Health

            </p>

          </div>

        </div>

        {/* ===========================
            REVENUE & AI
        ============================ */}

        <div className="mt-10 grid gap-6 xl:grid-cols-3">

          <ChartCard
            title="Revenue Intelligence"
            subtitle="Business Growth - Last 6 Months"
            className="xl:col-span-2"
          >

            <RevenueChart />

          </ChartCard>

          <AIInsight />

        </div>

        {/* ===========================
            FLEET & OPERATIONS
        ============================ */}

        <div className="mt-10 grid gap-6 xl:grid-cols-3">          <ChartCard
            title="Fleet Distribution"
            subtitle="Current Vehicle Status"
          >
            <FleetChart />
          </ChartCard>

          <FleetHealth />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold text-slate-900">
                  Operations Center
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Today's operational overview
                </p>

              </div>

              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                LIVE
              </span>

            </div>

            <div className="space-y-5">

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div>

                  <p className="font-semibold">
                    Airport Pickups
                  </p>

                  <p className="text-sm text-slate-500">
                    Scheduled Today
                  </p>

                </div>

                <span className="text-2xl font-bold text-blue-600">
                  64
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div>

                  <p className="font-semibold">
                    Airport Drop-offs
                  </p>

                  <p className="text-sm text-slate-500">
                    Scheduled Today
                  </p>

                </div>

                <span className="text-2xl font-bold text-emerald-600">
                  54
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div>

                  <p className="font-semibold">
                    Corporate Trips
                  </p>

                  <p className="text-sm text-slate-500">
                    Running
                  </p>

                </div>

                <span className="text-2xl font-bold text-violet-600">
                  27
                </span>

              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">

                <div>

                  <p className="font-semibold">
                    Outstation Trips
                  </p>

                  <p className="text-sm text-slate-500">
                    Active
                  </p>

                </div>

                <span className="text-2xl font-bold text-orange-600">
                  18
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* ===========================
            QUICK ACTIONS & LIVE ACTIVITY
        ============================ */}

        <div className="mt-10 grid gap-6 xl:grid-cols-2">

        <QuickCommand />

        <LiveOperations />

        </div>

        {/* ===========================
            RECENT BOOKINGS & NOTIFICATIONS
        ============================ */}

        <div className="mt-10 grid gap-6 xl:grid-cols-2">

       <RecentBookings />

       <BookingTimeline />

        </div>

        <div className="mt-10">

        <AlertCenter />

        </div>

        {/* ===========================
            BUSINESS OVERVIEW
        ============================ */}

        <div className="mt-10 grid gap-6 xl:grid-cols-2">          <InfoCard title="Business Overview">

            <div className="space-y-5">

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Total Customers
                </span>

                <strong className="text-lg">
                  18,245
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Vendor Partners
                </span>

                <strong className="text-lg">
                  148
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Corporate Accounts
                </span>

                <strong className="text-lg">
                  326
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Completed Trips
                </span>

                <strong className="text-lg">
                  1,25,820
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Customer Rating
                </span>

                <strong className="text-lg text-amber-500">
                  ⭐ 4.9 / 5
                </strong>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-slate-600">
                  Cancellation Rate
                </span>

                <strong className="text-lg text-emerald-600">
                  1.8%
                </strong>

              </div>

            </div>

          </InfoCard>

          <div className="space-y-6">

            <InfoCard title="Finance Summary">

              <div className="space-y-4">

                <div className="flex items-center justify-between">

                  <span>Today's Collection</span>

                  <strong className="text-emerald-600">
                    ₹1,84,500
                  </strong>

                </div>

                <div className="flex items-center justify-between">

                  <span>Vendor Payables</span>

                  <strong className="text-orange-500">
                    ₹72,400
                  </strong>

                </div>

                <div className="flex items-center justify-between">

                  <span>Outstanding Amount</span>

                  <strong className="text-red-500">
                    ₹18,200
                  </strong>

                </div>

                <div className="flex items-center justify-between">

                  <span>Net Profit Today</span>

                  <strong className="text-blue-600">
                    ₹64,850
                  </strong>

                </div>

              </div>

            </InfoCard>

            <InfoCard title="AI Business Advisor">

              <div className="space-y-4">

                <div className="rounded-xl bg-emerald-50 p-4">

                  <p className="font-semibold text-emerald-700">

                    📈 Revenue expected to grow 16% today.

                  </p>

                </div>

                <div className="rounded-xl bg-blue-50 p-4">

                  <p className="font-semibold text-blue-700">

                    🚖 Pune Airport demand is increasing.

                  </p>

                </div>

                <div className="rounded-xl bg-orange-50 p-4">

                  <p className="font-semibold text-orange-700">

                    ⚠ 6 vehicles require maintenance this week.

                  </p>

                </div>

                <div className="rounded-xl bg-violet-50 p-4">

                  <p className="font-semibold text-violet-700">

                    🏢 Corporate bookings increased by 11%.

                  </p>

                </div>

              </div>

            </InfoCard>

          </div>

        </div>

        {/* ===========================
            SYSTEM STATUS
        ============================ */}

        <div className="mt-10 rounded-[30px] border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h2 className="text-3xl font-bold">

                RideGrid Enterprise Status

              </h2>

              <p className="mt-3 text-slate-300">

                All enterprise services are monitored in real time.

              </p>

            </div>

            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">

              <div>

                <p className="text-slate-400 text-sm">
                  API
                </p>

                <h3 className="mt-2 text-2xl font-bold text-emerald-400">
                  Online
                </h3>

              </div>

              <div>

                <p className="text-slate-400 text-sm">
                  Database
                </p>

                <h3 className="mt-2 text-2xl font-bold text-emerald-400">
                  Healthy
                </h3>

              </div>

              <div>

                <p className="text-slate-400 text-sm">
                  Payments
                </p>

                <h3 className="mt-2 text-2xl font-bold text-blue-400">
                  Active
                </h3>

              </div>

              <div>

                <p className="text-slate-400 text-sm">
                  Notifications
                </p>

                <h3 className="mt-2 text-2xl font-bold text-orange-400">
                  Running
                </h3>

              </div>

            </div>

          </div>

        </div>        {/* ===========================
            FOOTER
        ============================ */}

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-sm lg:flex-row">

          <div>

            <h3 className="text-lg font-bold text-slate-900">
              RideGrid Enterprise Platform
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Enterprise Mobility Management System • Version 2.0
            </p>

          </div>

          <div className="flex flex-wrap gap-8 text-center">

            <div>

              <p className="text-xs uppercase tracking-wide text-slate-400">
                Server Uptime
              </p>

              <p className="mt-1 font-bold text-emerald-600">
                99.98%
              </p>

            </div>

            <div>

              <p className="text-xs uppercase tracking-wide text-slate-400">
                Response Time
              </p>

              <p className="mt-1 font-bold text-blue-600">
                182 ms
              </p>

            </div>

            <div>

              <p className="text-xs uppercase tracking-wide text-slate-400">
                Active Sessions
              </p>

              <p className="mt-1 font-bold text-violet-600">
                148
              </p>

            </div>

            <div>

              <p className="text-xs uppercase tracking-wide text-slate-400">
                Last Sync
              </p>

              <p className="mt-1 font-bold text-slate-700">
                Just Now
              </p>

            </div>

          </div>

        </div>

      </PageContainer>

    </DashboardLayout>
  );
}