'use client';

import DistanceCard from './DistanceCard';

interface FareInputSectionProps {
  tripType: string;

  baseFare: number;
  setBaseFare: (value: number) => void;

  totalDistance: number;
  setTotalDistance: (value: number) => void;

  totalDays: number;
  setTotalDays: (value: number) => void;

  vendorRatePerKm: number;
  setVendorRatePerKm: (value: number) => void;
}

export default function FareInputSection({
  tripType,

  baseFare,
  setBaseFare,

  totalDistance,
  setTotalDistance,

  totalDays,
  setTotalDays,

  vendorRatePerKm,
  setVendorRatePerKm,
}: FareInputSectionProps) {
  const isRoundTrip =
    tripType === 'Outstation Round Trip' ||
    tripType === 'Multi City';

  const isAirport =
    tripType === 'Airport Transfer';

  const isOneWay =
    tripType === 'Outstation One Way';

  const isHourly =
    tripType === 'Hourly Rental';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold">
          Fare Inputs
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure pricing parameters for this booking.
        </p>
      </div>

      <div className="space-y-6 p-6">

        {(isAirport || isOneWay || isHourly) && (
          <div>
            <label className="mb-2 block text-sm font-medium">
              Base Fare (₹)
            </label>

            <input
              type="number"
              min={0}
              value={baseFare}
              onChange={(e) =>
                setBaseFare(Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {(isRoundTrip || isOneWay) && (
          <div>
            <label className="mb-2 block text-sm font-medium">
              Vendor Rate / KM (₹)
            </label>

            <input
              type="number"
              min={0}
              value={vendorRatePerKm}
              onChange={(e) =>
                setVendorRatePerKm(
                  Number(e.target.value)
                )
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <DistanceCard
          tripType={tripType}
          totalDistance={totalDistance}
          setTotalDistance={setTotalDistance}
          totalDays={totalDays}
          setTotalDays={setTotalDays}
        />

      </div>

    </div>
  );
}