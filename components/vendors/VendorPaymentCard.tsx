"use client";

import { useEffect, useState } from "react";
import { Vendor } from "../../data/vendors";

interface Props {
  vendor: Vendor;
}

type Settlement = {
  id: string;
  amount: number;
  commission: number;
  netAmount: number;
  settlementStatus: string;
  settlementReference?: string | null;
  bankReference?: string | null;
  createdAt: string;
  settledAt?: string | null;
};

export default function VendorPaymentCard({ vendor }: Props) {
  const [data, setData] = useState<{
    totalEarned: number;
    totalSettled: number;
    pendingPayment: number;
    settlements: Settlement[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/vendors/details?vendorId=${encodeURIComponent(vendor.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setData(result.data.payments);
      })
      .catch(console.error);
  }, [vendor.id]);

  const money = (value: number) =>
    `?${value.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Payment Summary</h3>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Total Earnings</p>
          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {data ? money(data.totalEarned) : "—"}
          </h2>
        </div>

        <div className="rounded-xl bg-yellow-50 p-5">
          <p className="text-sm text-slate-500">Pending Payment</p>
          <h2 className="mt-2 text-3xl font-bold text-yellow-700">
            {data ? money(data.pendingPayment) : "—"}
          </h2>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        {!data ? (
          <p className="py-5 text-center text-sm text-slate-500">
            Loading payments...
          </p>
        ) : data.settlements.length === 0 ? (
          <p className="py-5 text-center text-sm text-slate-500">
            No settlement records available.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.settlements.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-3 py-3">
                    {new Date(item.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-3 py-3">{money(Number(item.netAmount))}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                      {item.settlementStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}