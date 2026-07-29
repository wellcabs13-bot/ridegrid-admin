'use client';

import {
  BadgeCheck,
  CalendarDays,
  CarFront,
  CreditCard,
  Hash,
  User,
} from 'lucide-react';

interface Props {
  booking: any;
}

export default function BookingInfoCard({ booking }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
          <User className="h-5 w-5 text-blue-600" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Booking Information
          </h3>

          <p className="text-sm text-slate-500">
            General booking details
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <InfoItem
          icon={<Hash size={18} />}
          label="Booking ID"
          value={booking.id}
        />

        <InfoItem
          icon={<User size={18} />}
          label="Customer"
          value={booking.customer}
        />

        <InfoItem
          icon={<CarFront size={18} />}
          label="Vehicle"
          value={booking.vehicle}
        />

        <InfoItem
          icon={<CalendarDays size={18} />}
          label="Journey Date"
          value={booking.date}
        />

        <InfoItem
          icon={<BadgeCheck size={18} />}
          label="Booking Status"
          value={booking.status}
        />

        <InfoItem
          icon={<CreditCard size={18} />}
          label="Payment Status"
          value={booking.payment}
        />

      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>

      <p className="text-base font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}