'use client';

const vendors = [
  {
    vendor: 'Sai Travels',
    revenue: '₹8.4L',
    bookings: 624,
    score: 96,
  },
  {
    vendor: 'Royal Tours',
    revenue: '₹7.9L',
    bookings: 588,
    score: 94,
  },
  {
    vendor: 'Prime Cabs',
    revenue: '₹6.8L',
    bookings: 526,
    score: 91,
  },
  {
    vendor: 'Shiv Travels',
    revenue: '₹5.7L',
    bookings: 472,
    score: 89,
  },
];

export default function VendorAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Top Vendors</h2>

        <p className="mt-1 text-sm text-slate-500">Best performing vendors</p>
      </div>

      <div className="divide-y divide-slate-100">
        {vendors.map((vendor) => (
          <div
            key={vendor.vendor}
            className="flex items-center justify-between px-6 py-5 hover:bg-slate-50"
          >
            <div>
              <h3 className="font-semibold text-slate-900">{vendor.vendor}</h3>

              <p className="mt-1 text-sm text-slate-500">
                {vendor.bookings} Bookings
              </p>
            </div>

            <div className="text-right">
              <h3 className="font-bold text-indigo-600">{vendor.revenue}</h3>

              <p className="mt-1 text-sm text-green-600">
                {vendor.score}% Score
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
