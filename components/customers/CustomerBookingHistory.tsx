"use client";

import { Customer } from "@/types/customer-ui";

interface Props {
  customer: Customer;
}

export default function CustomerBookingHistory({
  customer,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Booking History
        </h3>

        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {customer.totalBookings} Trips
        </span>
      </div>

      {customer.totalBookings === 0 ? (
        <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
          No bookings found for this customer.
        </div>
      ) : (
        <div className="rounded-lg border bg-slate-50 p-5">
          <p className="text-sm text-slate-600">
            {customer.totalBookings} booking
            {customer.totalBookings === 1 ? "" : "s"}{" "}
            recorded.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Detailed booking records are available
            through the Booking module.
          </p>
        </div>
      )}
    </section>
  );
}