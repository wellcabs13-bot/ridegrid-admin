interface VendorHeaderProps {
  totalVendors: number;
  onAddVendor: () => void;
}

export default function VendorHeader({
  totalVendors,
  onAddVendor,
}: VendorHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Vendors</h1>

        <p className="text-slate-500">Total Vendors : {totalVendors}</p>
      </div>

      <button
        onClick={onAddVendor}
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        + Add Vendor
      </button>
    </div>
  );
}
