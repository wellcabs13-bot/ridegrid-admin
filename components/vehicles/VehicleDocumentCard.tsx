'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleDocumentCardProps {
  vehicle: Vehicle;
}

export default function VehicleDocumentCard({
  vehicle,
}: VehicleDocumentCardProps) {
  const documents = [
    'Registration Certificate (RC)',
    'Insurance Policy',
    'National Permit',
    'Fitness Certificate',
    'Pollution Certificate',
    'Road Tax Receipt',
    'Vehicle Photos',
    'FASTag Details',
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold">Vehicle Documents</h3>

        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Upload Document
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {documents.map((document) => (
          <div
            key={document}
            className="flex items-center justify-between rounded-lg border p-4 transition hover:border-blue-400"
          >
            <div>
              <h4 className="font-medium">{document}</h4>

              <p className="text-sm text-slate-500">PDF / JPG</p>
            </div>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Verified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
