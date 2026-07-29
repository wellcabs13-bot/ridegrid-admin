'use client';

interface TripSectionProps {
  tripType: string;
  setTripType: (value: string) => void;

  journeyDate: string;
  setJourneyDate: (value: string) => void;

  journeyTime: string;
  setJourneyTime: (value: string) => void;
}

const tripTypes = [
  'Airport Transfer',
  'Outstation One Way',
  'Outstation Round Trip',
  'Hourly Rental',
  'Multi City',
  'Corporate',
  'Package Tour',
];

export default function TripSection({
  tripType,
  setTripType,
  journeyDate,
  setJourneyDate,
  journeyTime,
  setJourneyTime,
}: TripSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-800">
        Journey Details
      </h2>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Trip Type
          </label>

          <select
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          >
            {tripTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Journey Date
          </label>

          <input
            type="date"
            value={journeyDate}
            onChange={(e) => setJourneyDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Journey Time
          </label>

          <input
            type="time"
            value={journeyTime}
            onChange={(e) => setJourneyTime(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </div>
      </div>
    </div>
  );
}