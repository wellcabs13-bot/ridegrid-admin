'use client';

interface InvoiceDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function InvoiceDrawer({ open, onClose }: InvoiceDrawerProps) {
  if (!open) return null;

  const invoice = {
    invoiceNo: 'INV-2026-001245',
    bookingId: 'BK-874521',
    customer: 'Rahul Sharma',
    vendor: 'Sai Travels',
    vehicle: 'Toyota Innova Crysta',
    paymentMethod: 'UPI',
    status: 'Paid',
    date: '26 Jul 2026',
    subtotal: 4500,
    gst: 810,
    total: 5310,
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/40" />

      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Invoice Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Invoice & Payment Information
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-2xl text-slate-500 transition hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <p className="text-sm opacity-80">Invoice Number</p>

            <h2 className="mt-2 text-3xl font-bold">{invoice.invoiceNo}</h2>

            <div className="mt-5 inline-flex rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
              {invoice.status}
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Booking ID</span>

              <span className="font-semibold text-slate-900">
                {invoice.bookingId}
              </span>
            </div>

            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Customer</span>

              <span className="font-semibold text-slate-900">
                {invoice.customer}
              </span>
            </div>

            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Vendor</span>

              <span className="font-semibold text-slate-900">
                {invoice.vendor}
              </span>
            </div>

            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Vehicle</span>

              <span className="font-semibold text-slate-900">
                {invoice.vehicle}
              </span>
            </div>

            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Payment Method</span>

              <span className="font-semibold text-slate-900">
                {invoice.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between border-b pb-4">
              <span className="text-slate-500">Invoice Date</span>

              <span className="font-semibold text-slate-900">
                {invoice.date}
              </span>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="font-bold text-slate-900">Payment Summary</h3>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>

                <span className="font-semibold">
                  ₹{invoice.subtotal.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-600">GST</span>

                <span className="font-semibold">
                  ₹{invoice.gst.toLocaleString()}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-indigo-600">
                    ₹{invoice.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 p-6">
          <button className="rounded-xl border border-slate-300 py-3 font-semibold transition hover:bg-slate-100">
            Download PDF
          </button>

          <button className="rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
            Print Invoice
          </button>
        </div>
      </div>
    </>
  );
}
