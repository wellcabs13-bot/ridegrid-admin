'use client';

import { coupons } from '@/data/settings';

export default function CouponSettings() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Coupon Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create and manage promotional coupon codes.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          New Coupon
        </button>
      </div>

      <div className="space-y-4 p-6">
        {coupons.map((coupon) => (
          <div
            key={coupon}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-5 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{coupon}</h3>

              <p className="text-sm text-slate-500">
                Active promotional coupon.
              </p>
            </div>

            <div className="flex gap-3">
              <button className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
                Edit
              </button>

              <button className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
