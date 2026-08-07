"use client";

export default function Footer() {
  return (
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

        <Item
          title="Server Uptime"
          value="99.98%"
          color="text-emerald-600"
        />

        <Item
          title="Response Time"
          value="182 ms"
          color="text-blue-600"
        />

        <Item
          title="Active Sessions"
          value="148"
          color="text-violet-600"
        />

        <Item
          title="Last Sync"
          value="Just Now"
          color="text-slate-700"
        />

      </div>

    </div>
  );
}

function Item({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div>

      <p className="text-xs uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className={`mt-1 font-bold ${color}`}>
        {value}
      </p>

    </div>
  );
}