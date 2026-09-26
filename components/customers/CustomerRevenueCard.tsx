"use client";

import { Customer } from "@/types/customer-ui";

interface Props {
  customer: Customer;
}

export default function CustomerRevenueCard({
  customer,
}: Props) {
  const total =
    Number(
      customer.totalSpent.replace(
        /[₹,]/g,
        ""
      )
    ) || 0;

  const average =
    customer.totalBookings > 0
      ? Math.round(
          total / customer.totalBookings
        )
      : 0;

  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="mb-5 text-lg font-semibold">
        Revenue Summary
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">
            Total Bookings
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-700">
            {customer.totalBookings}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">
            Total Revenue
          </p>

          <p className="mt-2 text-3xl font-bold text-green-700">
            {customer.totalSpent}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-500">
            Average Per Booking
          </p>

          <p className="mt-1 text-lg font-semibold">
            ₹{average.toLocaleString("en-IN")}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            customer.status === "Active"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {customer.status}
        </span>
      </div>
    </section>
  );
}