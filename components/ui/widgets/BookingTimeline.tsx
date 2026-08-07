"use client";

import {
  CheckCircle2,
  Car,
  UserCheck,
  Clock3,
  MapPin,
} from "lucide-react";

const timeline = [
  {
    time: "09:15 AM",
    title: "Booking Created",
    desc: "RG240801245",
    icon: Clock3,
    color: "bg-blue-500",
  },
  {
    time: "09:18 AM",
    title: "Driver Assigned",
    desc: "Rahul Patil",
    icon: UserCheck,
    color: "bg-violet-500",
  },
  {
    time: "09:28 AM",
    title: "Driver Reached",
    desc: "Pickup Location",
    icon: MapPin,
    color: "bg-orange-500",
  },
  {
    time: "09:35 AM",
    title: "Trip Started",
    desc: "Mumbai Airport",
    icon: Car,
    color: "bg-cyan-500",
  },
  {
    time: "Running",
    title: "Trip Live",
    desc: "ETA 42 Minutes",
    icon: CheckCircle2,
    color: "bg-emerald-500",
  },
];

export default function BookingTimeline() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-900">
            Live Booking Timeline
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Track the latest booking lifecycle
          </p>

        </div>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
          RG240801245
        </span>

      </div>

      <div className="space-y-6">

        {timeline.map((item, index) => {

          const Icon = item.icon;

          return (

            <div
              key={item.title}
              className="relative flex gap-5"
            >

              {index !== timeline.length - 1 && (

                <div className="absolute left-[22px] top-12 h-14 w-0.5 bg-slate-200" />

              )}

              <div
                className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-white ${item.color}`}
              >

                <Icon size={18} />

              </div>

              <div className="flex flex-1 items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white">

                <div>

                  <h3 className="font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.desc}
                  </p>

                </div>

                <div className="text-sm font-semibold text-slate-600">
                  {item.time}
                </div>

              </div>

            </div>

          );

        })}

      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 p-5 text-white">

        <h3 className="font-bold">
          Trip Status
        </h3>

        <p className="mt-2 text-sm opacity-90">
          Driver is on route to Mumbai Airport.
          Estimated arrival: <strong>42 Minutes</strong>.
        </p>

      </div>

    </div>
  );
}