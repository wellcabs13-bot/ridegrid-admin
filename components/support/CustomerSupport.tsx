'use client';

export default function CustomerSupport() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold">Customer Support</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer assistance and service requests.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          New Case
        </button>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-500">Open Cases</p>

          <h3 className="mt-2 text-3xl font-bold text-red-600">84</h3>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-500">Active Chats</p>

          <h3 className="mt-2 text-3xl font-bold text-green-600">16</h3>
        </div>

        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-500">Avg Response</p>

          <h3 className="mt-2 text-3xl font-bold text-indigo-600">2.4 min</h3>
        </div>
      </div>

      <div className="border-t p-6">
        <textarea
          rows={5}
          placeholder="Write response to customer..."
          className="w-full rounded-xl border border-slate-300 p-4 focus:border-indigo-600 focus:outline-none"
        />

        <div className="mt-5 flex justify-end">
          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Send Reply
          </button>
        </div>
      </div>
    </div>
  );
}
