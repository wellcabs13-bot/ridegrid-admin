'use client';

import {
  Car,
  Route,
  Receipt,
  Wallet,
  IndianRupee,
} from 'lucide-react';

import { FareOutput } from './types';

interface FareSummaryCardProps {
  fare: FareOutput;
}

function Item({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white p-2 shadow-sm">
          {icon}
        </div>

        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>
      </div>

      <span className="font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

export default function FareSummaryCard({
  fare,
}: FareSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Fare Summary
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Live booking fare overview
        </p>
      </div>

      <div className="space-y-4 p-6">

        <Item
          icon={<Route size={18} className="text-blue-600" />}
          label="Chargeable KM"
          value={`${fare.chargeableKm} KM`}
        />

        <Item
          icon={<Car size={18} className="text-green-600" />}
          label="Vendor Fare"
          value={`₹ ${fare.vendorFare.toLocaleString('en-IN')}`}
        />

        <Item
          icon={<Receipt size={18} className="text-orange-600" />}
          label="Extra Charges"
          value={`₹ ${fare.extraCharges.toLocaleString('en-IN')}`}
        />

        <Item
          icon={<Wallet size={18} className="text-purple-600" />}
          label="Platform Fee"
          value={`₹ ${fare.platformFee.toLocaleString('en-IN')}`}
        />

        <div className="border-t border-dashed border-slate-300 pt-4">

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Subtotal
            </span>

            <span className="font-semibold">
              ₹ {fare.subtotal.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Discount
            </span>

            <span className="font-semibold text-red-600">
              - ₹ {fare.discount.toLocaleString('en-IN')}
            </span>
          </div>

        </div>

        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white shadow-lg">

          <div className="flex items-center gap-2 text-blue-100">
            <IndianRupee size={18} />
            <span className="text-sm">
              Final Customer Fare
            </span>
          </div>

          <div className="mt-2 text-3xl font-bold">
            ₹ {fare.finalFare.toLocaleString('en-IN')}
          </div>

        </div>

      </div>

    </div>
  );
}