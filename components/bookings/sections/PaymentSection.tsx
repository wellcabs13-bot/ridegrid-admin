'use client';

import FareSummary from '../FareSummary';

interface PaymentSectionProps {
  paymentMethod: string;
  setPaymentMethod: (value: string) => void;

  fare: string;
  setFare: (value: string) => void;
}

export default function PaymentSection({
  paymentMethod,
  setPaymentMethod,
  fare,
  setFare,
}: PaymentSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Payment & Fare
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Payment Method
          </label>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Fare (₹)
          </label>

          <input
            type="number"
            value={fare}
            onChange={(e) => setFare(e.target.value)}
            placeholder="Enter Fare"
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>
      </div>

      <div className="mt-6">
        <FareSummary fare={fare} />
      </div>
    </div>
  );
}