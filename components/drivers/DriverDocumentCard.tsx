'use client';

import { Driver } from '../../data/drivers';

interface DriverDocumentCardProps {
  driver: Driver;
}

export default function DriverDocumentCard({
  driver,
}: DriverDocumentCardProps) {
  const documents = [
    {
      name: 'Driving License',
      number: driver.licenseNumber,
      status: 'Verified',
    },
    {
      name: 'Aadhaar Card',
      number: driver.aadhaar,
      status: 'Verified',
    },
    {
      name: 'Police Verification',
      number: 'PV-2026-4587',
      status: 'Verified',
    },
    {
      name: 'Medical Certificate',
      number: 'MC-2026-1142',
      status: 'Pending',
    },
    {
      name: 'Address Proof',
      number: 'Uploaded',
      status: 'Verified',
    },
    {
      name: 'Profile Photo',
      number: 'Uploaded',
      status: 'Verified',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-xl font-semibold text-slate-900">
          Driver Documents
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Verification status of all uploaded documents.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">
                Document
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Number / Status
              </th>

              <th className="px-6 py-3 text-left text-sm font-semibold">
                Verification
              </th>

              <th className="px-6 py-3 text-center text-sm font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.name}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-medium text-slate-800">
                  {doc.name}
                </td>

                <td className="px-6 py-4 text-slate-600">{doc.number}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      doc.status === 'Verified'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
