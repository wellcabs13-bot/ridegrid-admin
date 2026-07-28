interface CustomerHeaderProps {
  totalCustomers: number;
  onAddCustomer: () => void;
}

export default function CustomerHeader({
  totalCustomers,
  onAddCustomer,
}: CustomerHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-slate-500">Total Customers: {totalCustomers}</p>
      </div>

      <button
        onClick={onAddCustomer}
        className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
      >
        + Add Customer
      </button>
    </div>
  );
}
