'use client';

interface DistanceCardProps {
  tripType: string;

  totalDistance: number;
  setTotalDistance: (value: number) => void;

  totalDays: number;
  setTotalDays: (value: number) => void;
}

export default function DistanceCard({
  tripType,
  totalDistance,
  setTotalDistance,
  totalDays,
  setTotalDays,
}: DistanceCardProps) {
  const isRoundTrip =
    tripType === 'Outstation Round Trip' ||
    tripType === 'Multi City';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

      <h3 className="mb-5 text-base font-semibold text-slate-800">
        Journey Details
      </h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        <div>
          <label className="mb-2 block text-sm font-medium">
            Total Distance (KM)
          </label>

          <input
            type="number"
            min={0}
            value={totalDistance}
            onChange={(e) =>
              setTotalDistance(Number(e.target.value))
            }
            placeholder="Enter distance"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
          />
        </div>

        {isRoundTrip && (
          <div>
            <label className="mb-2 block text-sm font-medium">
              Total Days
            </label>

            <input
              type="number"
              min={1}
              value={totalDays}
              onChange={(e) =>
                setTotalDays(Number(e.target.value))
              }
              placeholder="Trip Days"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500"
            />
          </div>
        )}

      </div>

      {isRoundTrip && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">

          <h4 className="font-semibold text-blue-700">
            RideGrid Rule
          </h4>

          <p className="mt-2 text-sm text-slate-600">
            Minimum billing is <strong>300 KM per day</strong>.
            <br />
            Chargeable KM =
            <strong>
              {' '}
              Max(Total Distance, Days × 300)
            </strong>
          </p>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-white p-3">

            <span className="text-sm text-slate-600">
              Minimum Chargeable KM
            </span>

            <span className="font-bold text-blue-700">
              {totalDays * 300} KM
            </span>

          </div>

        </div>
      )}

    </div>
  );
}