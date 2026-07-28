'use client';

import { Vendor } from '../../data/vendors';

interface VendorPaymentCardProps {
  vendor: Vendor;
}

export default function VendorPaymentCard({ vendor }: VendorPaymentCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Payment Summary</h3>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Total Earnings</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {vendor.totalEarnings}
          </h2>
        </div>

        <div className="rounded-xl bg-yellow-50 p-5">
          <p className="text-sm text-slate-500">Pending Payment</p>

          <h2 className="mt-2 text-3xl font-bold text-yellow-700">
            {vendor.pendingPayment}
          </h2>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>

              <th className="px-3 py-2 text-left">Amount</th>

              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {[
              ['01 Jul', '₹18,000'],
              ['15 Jun', '₹25,000'],
              ['05 Jun', '₹32,500'],
            ].map((row, index) => (
              <tr key={index} className="border-b">
                <td className="px-3 py-3">{row[0]}</td>

                <td className="px-3 py-3">{row[1]}</td>

                <td className="px-3 py-3">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                    Paid
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
