'use client';

export default function VendorSupport() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Vendor Support</h2>

          <p className="mt-1 text-sm text-slate-500">
            Resolve vendor onboarding, settlement and operational issues.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Create Vendor Ticket
        </button>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-2">
        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Vendor Approval</h3>
          <p className="mt-2 text-sm text-slate-500">
            Verify business documents and activate vendor accounts.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Commission Issues</h3>
          <p className="mt-2 text-sm text-slate-500">
            Resolve settlement and commission disputes.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Vehicle Approval</h3>
          <p className="mt-2 text-sm text-slate-500">
            Review vehicle verification requests.
          </p>
        </div>

        <div className="rounded-xl border p-5">
          <h3 className="font-semibold">Account Assistance</h3>
          <p className="mt-2 text-sm text-slate-500">
            Help vendors with profile and operational issues.
          </p>
        </div>
      </div>
    </div>
  );
}
