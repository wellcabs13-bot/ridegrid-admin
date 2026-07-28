'use client';

import { paymentGateway } from '@/data/settings';

export default function PaymentGatewaySettings() {
  const gateways = [
    {
      title: 'Razorpay',
      enabled: paymentGateway.razorpay,
    },
    {
      title: 'UPI',
      enabled: paymentGateway.upi,
    },
    {
      title: 'Cash Payment',
      enabled: paymentGateway.cash,
    },
    {
      title: 'Wallet',
      enabled: paymentGateway.wallet,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Payment Gateway Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enable or disable supported payment methods.
          </p>
        </div>

        <button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700">
          Save Changes
        </button>
      </div>

      <div className="space-y-4 p-6">
        {gateways.map((gateway) => (
          <div
            key={gateway.title}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-5"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{gateway.title}</h3>

              <p className="mt-1 text-sm text-slate-500">
                Allow customers to pay using {gateway.title}.
              </p>
            </div>

            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                defaultChecked={gateway.enabled}
                className="peer sr-only"
              />

              <div className="peer h-6 w-11 rounded-full bg-slate-300 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-5" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
