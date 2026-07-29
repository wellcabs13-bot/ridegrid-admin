'use client';

import {
  CarFront,
  MapPin,
  Navigation,
  UserCircle2,
  Building2,
} from 'lucide-react';

interface Props {
  booking: any;
}

export default function TripInfoCard({ booking }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
          <CarFront className="h-5 w-5 text-emerald-600" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Trip Information
          </h3>

          <p className="text-sm text-slate-500">
            Route, vehicle and assignment details
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Pickup */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <Navigation size={18} />
            <span className="text-sm">Pickup Location</span>
          </div>

          <p className="font-semibold text-slate-900">
            {booking.pickup || 'Not Assigned'}
          </p>
        </div>

        {/* Drop */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-slate-500">
            <MapPin size={18} />
            <span className="text-sm">Drop Location</span>
          </div>

          <p className="font-semibold text-slate-900">
            {booking.drop || 'Not Assigned'}
          </p>
        </div>

        {/* Driver & Vendor */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <UserCircle2 size={18} />
              <span className="text-sm">Assigned Driver</span>
            </div>

            <p className="font-semibold text-slate-900">
              {booking.driver || 'Pending Assignment'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Building2 size={18} />
              <span className="text-sm">Vendor</span>
            </div>

            <p className="font-semibold text-slate-900">
              {booking.vendor || 'Pending Assignment'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}