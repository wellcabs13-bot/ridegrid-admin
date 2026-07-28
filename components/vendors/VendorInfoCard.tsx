'use client';

import { Vendor } from '../../data/vendors';

interface VendorInfoCardProps {
  vendor: Vendor;
}

export default function VendorInfoCard({ vendor }: VendorInfoCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Vendor Information</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-500">Vendor ID</p>

          <p className="mt-1 font-semibold">{vendor.id}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Company Name</p>

          <p className="mt-1 font-semibold">{vendor.companyName}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Owner Name</p>

          <p className="mt-1">{vendor.ownerName}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Mobile</p>

          <p className="mt-1">{vendor.mobile}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Email</p>

          <p className="mt-1 break-all">{vendor.email}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">City</p>

          <p className="mt-1">{vendor.city}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Joined Date</p>

          <p className="mt-1">{vendor.joinedDate}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Status</p>

          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              vendor.status === 'Active'
                ? 'bg-green-100 text-green-700'
                : vendor.status === 'Pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {vendor.status}
          </span>
        </div>
      </div>
    </div>
  );
}
