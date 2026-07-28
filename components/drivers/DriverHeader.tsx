'use client';

interface DriverHeaderProps {
  totalDrivers: number;
  onAddDriver: () => void;
}

export default function DriverHeader({
  totalDrivers,
  onAddDriver,
}: DriverHeaderProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-blue-600">
            RideGrid Driver Management
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">Drivers</h1>

          <p className="mt-2 text-slate-500">
            Manage all registered drivers, documents, trip history, attendance,
            earnings and performance from one place.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-xl bg-slate-100 px-4 py-2">
              <span className="text-sm text-slate-500">Total Drivers</span>

              <p className="text-xl font-bold text-slate-900">{totalDrivers}</p>
            </div>

            <div className="rounded-xl bg-green-100 px-4 py-2">
              <span className="text-sm text-green-700">Active System</span>

              <p className="text-xl font-bold text-green-700">Live</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-xl border border-slate-300 px-5 py-3 font-medium transition hover:bg-slate-100">
            Export
          </button>

          <button
            onClick={onAddDriver}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Driver
          </button>
        </div>
      </div>
    </div>
  );
}
