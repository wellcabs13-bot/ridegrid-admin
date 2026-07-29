'use client';

import { MapPin, Navigation, Flag } from 'lucide-react';

interface RoutePreviewProps {
  pickup: string;
  stops?: string[];
  destination: string;
}

export default function RoutePreview({
  pickup,
  stops = [],
  destination,
}: RoutePreviewProps) {
  const route = [
    pickup,
    ...stops.filter((stop) => stop.trim() !== ''),
    destination,
  ].filter((item) => item.trim() !== '');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <Navigation size={18} className="text-blue-600" />
        <h3 className="text-base font-semibold text-slate-800">
          Route Preview
        </h3>
      </div>

      {route.length === 0 ? (
        <p className="text-sm text-slate-500">
          Add locations to preview the journey.
        </p>
      ) : (
        <div className="space-y-3">
          {route.map((location, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {index === 0 ? (
                  <MapPin size={18} className="text-green-600" />
                ) : index === route.length - 1 ? (
                  <Flag size={18} className="text-red-600" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-blue-600" />
                )}

                {index !== route.length - 1 && (
                  <div className="mt-1 h-8 w-0.5 bg-slate-300" />
                )}
              </div>

              <div className="pt-0.5">
                <p className="text-sm font-medium text-slate-800">
                  {location}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}