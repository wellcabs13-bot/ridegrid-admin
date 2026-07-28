'use client';

import { bookingSettings } from '@/data/settings';

export default function BookingSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Booking Rules</h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure booking policies and automatic assignment.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save Rules
        </button>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Advance Booking (Hours)
          </label>

          <input
            type="number"
            defaultValue={bookingSettings.advanceBookingHours}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Free Cancellation Before (Hours)
          </label>

          <input
            type="number"
            defaultValue={bookingSettings.cancellationHours}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-5">
            <div>
              <h3 className="font-semibold text-slate-900">
                Auto Assign Driver
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Automatically assign the nearest available driver.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                defaultChecked={bookingSettings.autoAssignDriver}
                className="peer sr-only"
              />

              <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
