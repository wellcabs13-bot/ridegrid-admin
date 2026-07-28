'use client';

export default function AudienceSelector() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Audience Selector</h2>

        <p className="mt-1 text-sm text-slate-500">
          Choose exactly who should receive your communication.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">User Type</label>

            <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none">
              <option>All Users</option>
              <option>Customers</option>
              <option>Drivers</option>
              <option>Vendors</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">City</label>

            <select className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none">
              <option>All Cities</option>
              <option>Pune</option>
              <option>Mumbai</option>
              <option>Delhi</option>
              <option>Bengaluru</option>
            </select>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input type="checkbox" />
            Active Users
          </label>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input type="checkbox" />
            Premium Users
          </label>

          <label className="flex items-center gap-3 rounded-xl border p-4">
            <input type="checkbox" />
            Recently Registered
          </label>
        </div>

        <div className="rounded-xl bg-indigo-50 p-5">
          <h3 className="font-semibold text-indigo-700">Estimated Audience</h3>

          <p className="mt-2 text-4xl font-bold text-indigo-700">
            24,865 Users
          </p>
        </div>
      </div>
    </div>
  );
}
