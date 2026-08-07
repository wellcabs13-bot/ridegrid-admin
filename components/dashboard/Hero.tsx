"use client";

import {
  Activity,
  Wallet,
  Users,
  Car,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 p-10 text-white shadow-2xl">

      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />

      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10">

        <div className="flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between">

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

              <button className="rounded-xl bg-white px-7 py-3 font-semibold text-slate-900 hover:scale-105 transition">

                + New Booking

              </button>

              <button className="rounded-xl border border-white/20 bg-white/10 px-7 py-3 backdrop-blur hover:bg-white/20 transition">

                View Reports

              </button>

            </div>

          </div>

          <div className="grid grid-cols-2 gap-5">

            {[
              {
                icon: <Activity />,
                title: "Running Trips",
                value: "118",
                color: "text-emerald-300",
                change: "+8% Today",
              },
              {
                icon: <Wallet />,
                title: "Today's Revenue",
                value: "₹18.4L",
                color: "text-emerald-300",
                change: "+18%",
              },
              {
                icon: <Users />,
                title: "Active Drivers",
                value: "214",
                color: "text-blue-300",
                change: "Online",
              },
              {
                icon: <Car />,
                title: "Fleet Size",
                value: "426",
                color: "text-cyan-300",
                change: "Available",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl bg-white/10 p-6 backdrop-blur"
              >
                <div className="mb-5">
                  {item.icon}
                </div>

                <p className="text-sm text-slate-300">
                  {item.title}
                </p>

                <h2 className="mt-3 text-5xl font-bold">
                  {item.value}
                </h2>

                <p className={`mt-2 ${item.color}`}>
                  {item.change}
                </p>

              </div>
            ))}

          </div>

        </div>

      </div>

    </section>
  );
}