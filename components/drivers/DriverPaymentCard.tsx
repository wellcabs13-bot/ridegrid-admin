'use client';

import { Driver } from '../../data/drivers';

interface DriverPaymentCardProps {
  driver: Driver;
}

export default function DriverPaymentCard({ driver }: DriverPaymentCardProps) {
  const payments = [
    {
      month: 'July 2026',
      trips: 124,
      earnings: 78500,
      incentive: 6200,
      bonus: 2500,
      status: 'Paid',
    },
    {
      month: 'June 2026',
      trips: 118,
      earnings: 74200,
      incentive: 5800,
      bonus: 2000,
      status: 'Paid',
    },
    {
      month: 'May 2026',
      trips: 110,
      earnings: 69300,
      incentive: 5100,
      bonus: 1500,
      status: 'Paid',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Payment Summary
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Driver earnings, wallet and payment history.
        </p>
      </div>

      <div className="grid gap-5 p-6 md:grid-cols-3">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Lifetime Earnings</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">
            ₹{driver.earnings.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Wallet Balance</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            ₹{driver.wallet.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl bg-amber-50 p-5">
          <p className="text-sm text-slate-500">Total Trips</p>

          <h2 className="mt-2 text-3xl font-bold text-amber-600">
            {driver.trips}
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto border-t border-slate-200">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Month
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Trips
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Earnings
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Incentive
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Bonus
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {payments.map((payment) => (
              <tr
                key={payment.month}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium">{payment.month}</td>

                <td className="px-6 py-4">{payment.trips}</td>

                <td className="px-6 py-4 font-semibold text-green-700">
                  ₹{payment.earnings.toLocaleString()}
                </td>

                <td className="px-6 py-4">
                  ₹{payment.incentive.toLocaleString()}
                </td>

                <td className="px-6 py-4">₹{payment.bonus.toLocaleString()}</td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
