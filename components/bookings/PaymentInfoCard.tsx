'use client';

import { CreditCard, IndianRupee, Wallet } from 'lucide-react';

interface PaymentInfoCardProps {
  booking: {
    amount: string;
    payment: string;
  };
}

export default function PaymentInfoCard({
  booking,
}: PaymentInfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100">
          <Wallet className="h-5 w-5 text-violet-600" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Payment Information
          </h3>

          <p className="text-sm text-slate-500">
            Fare and payment details
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <IndianRupee size={18} />
            <span>Trip Fare</span>
          </div>

          <span className="text-lg font-bold text-slate-900">
            {booking.amount}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <CreditCard size={18} />
            <span>Payment Status</span>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              booking.payment === 'Paid'
                ? 'bg-emerald-100 text-emerald-700'
                : booking.payment === 'Pending'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {booking.payment}
          </span>
        </div>
      </div>
    </div>
  );
}