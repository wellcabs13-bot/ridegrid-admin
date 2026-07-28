'use client';

import { Driver } from '../../data/drivers';

interface DriverInfoCardProps {
  driver: Driver;
}

export default function DriverInfoCard({ driver }: DriverInfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Driver Information
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Personal profile and contact information.
        </p>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-sm text-slate-500">Full Name</p>
          <p className="mt-1 font-semibold text-slate-800">{driver.name}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Mobile Number</p>
          <p className="mt-1 font-semibold text-slate-800">{driver.mobile}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Email Address</p>
          <p className="mt-1 font-semibold text-slate-800">{driver.email}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Aadhaar Number</p>
          <p className="mt-1 font-semibold text-slate-800">{driver.aadhaar}</p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Experience</p>
          <p className="mt-1 font-semibold text-slate-800">
            {driver.experience}
          </p>
        </div>

        <div>
          <p className="text-sm text-slate-500">Joining Date</p>
          <p className="mt-1 font-semibold text-slate-800">{driver.joinDate}</p>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <p className="text-sm text-slate-500">Address</p>

          <p className="mt-1 font-semibold text-slate-800">
            {driver.address}, {driver.city}, {driver.state} - {driver.pincode}
          </p>
        </div>
      </div>
    </div>
  );
}
