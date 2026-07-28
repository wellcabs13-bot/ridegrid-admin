'use client';

import { Customer } from '../../data/customers';

interface CustomerInfoCardProps {
  customer: Customer;
}

export default function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold">Customer Information</h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-500">Customer ID</p>
          <p className="mt-1 font-semibold">{customer.id}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Name</p>
          <p className="mt-1 font-semibold">{customer.name}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Mobile</p>
          <p className="mt-1">{customer.mobile}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Email</p>
          <p className="mt-1 break-all">{customer.email}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">City</p>
          <p className="mt-1">{customer.city}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Joined On</p>
          <p className="mt-1">{customer.joinedDate}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Preferred Vehicle</p>
          <p className="mt-1">{customer.preferredVehicle}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Preferred Driver</p>
          <p className="mt-1">{customer.preferredDriver}</p>
        </div>
      </div>
    </div>
  );
}
