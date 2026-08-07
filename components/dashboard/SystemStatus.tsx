"use client";

export default function SystemStatus() {
  return (
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

          <Status
            title="API"
            value="Online"
            color="text-emerald-400"
          />

          <Status
            title="Database"
            value="Healthy"
            color="text-emerald-400"
          />

          <Status
            title="Payments"
            value="Active"
            color="text-blue-400"
          />

          <Status
            title="Notifications"
            value="Running"
            color="text-orange-400"
          />

        </div>

      </div>

    </div>
  );
}

function Status({
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

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <h3 className={`mt-2 text-2xl font-bold ${color}`}>
        {value}
      </h3>

    </div>
  );
}