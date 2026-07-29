'use client';

import { FareOutput } from './types';

interface Props {
  fare: FareOutput;
}

function Row({
  title,
  value,
  bold = false,
}: {
  title: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2 ${
        bold ? 'font-semibold text-slate-900' : 'text-slate-600'
      }`}
    >
      <span>{title}</span>

      <span>
        ₹ {value.toLocaleString('en-IN')}
      </span>
    </div>
  );
}

export default function FareBreakdown({
  fare,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">

      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold">
          Fare Breakdown
        </h2>
      </div>

      <div className="space-y-1 p-6">

        <Row
          title="Chargeable KM"
          value={fare.chargeableKm}
        />

        <Row
          title="Vendor Fare"
          value={fare.vendorFare}
        />

        <Row
          title="Extra Charges"
          value={fare.extraCharges}
        />

        <Row
          title="Platform Fee"
          value={fare.platformFee}
        />

        <hr className="my-3" />

        <Row
          title="Subtotal"
          value={fare.subtotal}
          bold
        />

        <Row
          title="Discount"
          value={fare.discount}
        />

        <hr className="my-3" />

        <div className="flex items-center justify-between rounded-xl bg-blue-600 px-5 py-4 text-white">

          <span className="text-lg font-semibold">
            Final Fare
          </span>

          <span className="text-2xl font-bold">
            ₹ {fare.finalFare.toLocaleString('en-IN')}
          </span>

        </div>

      </div>

    </div>
  );
}