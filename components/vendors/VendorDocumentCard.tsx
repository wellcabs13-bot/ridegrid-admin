"use client";

import { useEffect, useState } from "react";
import { Vendor } from "../../data/vendors";

interface Props {
  vendor: Vendor;
}

type DocumentItem = {
  id: string;
  documentType: string;
  documentNumber?: string | null;
  fileUrl: string;
  status: string;
  createdAt: string;
  expiryDate?: string | null;
};

const labels: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  OTHER: "Other",
};

export default function VendorDocumentCard({ vendor }: Props) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/details?vendorId=${encodeURIComponent(vendor.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setDocuments(result.data.documents ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vendor.id]);

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Uploaded Documents</h3>

      {loading ? (
        <p className="py-5 text-center text-sm text-slate-500">
          Loading documents...
        </p>
      ) : documents.length === 0 ? (
        <p className="py-5 text-center text-sm text-slate-500">
          No vendor documents uploaded.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p className="font-medium">
                  {labels[doc.documentType] ?? doc.documentType}
                </p>
                <p className="text-xs text-slate-500">
                  {doc.status}
                </p>
              </div>

              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                View
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}