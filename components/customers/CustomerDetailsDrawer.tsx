'use client';

import { Customer } from '../../data/customers';
import CustomerInfoCard from './CustomerInfoCard';
import CustomerRevenueCard from './CustomerRevenueCard';
import CustomerBookingHistory from './CustomerBookingHistory';

interface CustomerDetailsDrawerProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
}

export default function CustomerDetailsDrawer({
  open,
  customer,
  onClose,
}: CustomerDetailsDrawerProps) {
  if (!open || !customer) return null;

  return (
    <>
      {/* Overlay */}

      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Drawer */}

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        {/* Header */}

        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">Customer Details</h2>

            <p className="text-sm text-slate-500">{customer.id}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        {/* Content */}

        <div className="space-y-6 p-6">
          <CustomerInfoCard customer={customer} />

          <CustomerRevenueCard customer={customer} />

          <CustomerBookingHistory customer={customer} />
        </div>
      </div>
    </>
  );
}
