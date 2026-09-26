"use client";

import CustomerBookingHistory from "./CustomerBookingHistory";
import CustomerInfoCard from "./CustomerInfoCard";
import CustomerRevenueCard from "./CustomerRevenueCard";
import { Customer } from "@/types/customer-ui";

interface Props {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerDetailsDrawer({
  open,
  customer,
  onClose,
}: Props) {
  if (!open || !customer) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close customer drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-slate-50 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">
              Customer Profile
            </p>

            <h2 className="text-2xl font-bold text-slate-900">
              {customer.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="space-y-5">
          <CustomerInfoCard customer={customer} />

          <CustomerRevenueCard customer={customer} />

          <CustomerBookingHistory
            customer={customer}
          />
        </div>
      </aside>
    </div>
  );
}