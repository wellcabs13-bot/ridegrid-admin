'use client';

import { Vendor } from '../../data/vendors';

interface VendorDocumentCardProps {
  vendor: Vendor;
}

export default function VendorDocumentCard({
  vendor,
}: VendorDocumentCardProps) {
  const docs = [
    'Aadhaar Card',
    'PAN Card',
    'Driving License',
    'RC Book',
    'Vehicle Insurance',
    'PUC Certificate',
    'Bank Passbook',
    'GST Certificate',
  ];

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Uploaded Documents</h3>

      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <div
            key={doc}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="font-medium">{doc}</span>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              Verified
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
