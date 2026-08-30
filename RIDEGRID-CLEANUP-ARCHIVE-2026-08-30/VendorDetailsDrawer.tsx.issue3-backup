'use client';

import { Vendor } from '../../data/vendors';
import VendorInfoCard from './VendorInfoCard';
import VendorVehicleCard from './VendorVehicleCard';
import VendorPaymentCard from './VendorPaymentCard';
import VendorDocumentCard from './VendorDocumentCard';
import VendorPerformanceCard from './VendorPerformanceCard';

interface VendorDetailsDrawerProps {
  open: boolean;
  vendor: Vendor | null;
  onClose: () => void;
}

export default function VendorDetailsDrawer({
  open,
  vendor,
  onClose,
}: VendorDetailsDrawerProps) {
  if (!open || !vendor) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-2xl overflow-y-auto bg-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold">Vendor Details</h2>

            <p className="text-sm text-slate-500">{vendor.companyName}</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 p-6">
          <VendorInfoCard vendor={vendor} />

          <VendorVehicleCard vendor={vendor} />

          <VendorPaymentCard vendor={vendor} />

          <VendorDocumentCard vendor={vendor} />

          <VendorPerformanceCard vendor={vendor} />
        </div>
      </div>
    </>
  );
}
