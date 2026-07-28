'use client';

export default function DriverSupport() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold">Driver Support</h2>

          <p className="mt-1 text-sm text-slate-500">
            Handle driver issues, onboarding, payouts and trip assistance.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          Contact Driver
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Driver Verification</h3>

          <p className="mt-2 text-sm text-slate-500">
            Verify documents and approve new driver registrations.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Earnings Support</h3>

          <p className="mt-2 text-sm text-slate-500">
            Resolve payout, commission and incentive related issues.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Trip Assistance</h3>

          <p className="mt-2 text-sm text-slate-500">
            Emergency support during active rides.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Account Suspension</h3>

          <p className="mt-2 text-sm text-slate-500">
            Review complaints and reinstate eligible drivers.
          </p>
        </div>
      </div>

      <div className="border-t px-6 py-5">
        <button className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
          Open Driver Ticket
        </button>
      </div>
    </div>
  );
}
