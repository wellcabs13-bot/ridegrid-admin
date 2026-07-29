'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import LocationCard from './LocationCard';
import RoutePreview from './RoutePreview';

interface LocationSectionProps {
  tripType: string;

  pickup: string;
  setPickup: (value: string) => void;

  drop: string;
  setDrop: (value: string) => void;
}

export default function LocationSection({
  tripType,
  pickup,
  setPickup,
  drop,
  setDrop,
}: LocationSectionProps) {
  const [stops, setStops] = useState<string[]>([]);

  const addStop = () => {
    setStops([...stops, '']);
  };

  const updateStop = (index: number, value: string) => {
    const updated = [...stops];
    updated[index] = value;
    setStops(updated);
  };

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">
        Locations
      </h2>

      <LocationCard
        title="Pickup Location"
        value={pickup}
        onChange={setPickup}
        placeholder="Enter Pickup Location"
        required
      />

      {tripType === 'Multi City' && (
        <>
          {stops.map((stop, index) => (
            <div
              key={index}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <LocationCard
                  title={`Stop ${index + 1}`}
                  value={stop}
                  onChange={(value) =>
                    updateStop(index, value)
                  }
                  placeholder="Enter Stop"
                />
              </div>

              <button
                type="button"
                onClick={() => removeStop(index)}
                className="rounded-xl border border-red-200 p-3 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 px-5 py-3 text-blue-600 hover:bg-blue-50"
          >
            <Plus size={18} />
            Add Stop
          </button>
        </>
      )}

      {tripType !== 'Hourly Rental' && (
        <LocationCard
          title="Destination"
          value={drop}
          onChange={setDrop}
          placeholder="Enter Destination"
          required
        />
      )}

      <RoutePreview
        pickup={pickup}
        stops={stops}
        destination={drop}
      />
    </div>
  );
}