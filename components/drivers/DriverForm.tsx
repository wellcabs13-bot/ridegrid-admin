'use client';

export default function DriverForm() {
  return (
    <form
      id="driverForm"
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        alert('Driver saved successfully.');
      }}
    >
      {/* Personal Information */}
      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Personal Information
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Full Name</label>
            <input
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Driver Name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Mobile Number
            </label>
            <input
              className="w-full rounded-xl border px-4 py-3"
              placeholder="+91XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input
              className="w-full rounded-xl border px-4 py-3"
              placeholder="driver@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Aadhaar Number
            </label>
            <input className="w-full rounded-xl border px-4 py-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date of Birth
            </label>
            <input type="date" className="w-full rounded-xl border px-4 py-3" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Experience</label>
            <input
              className="w-full rounded-xl border px-4 py-3"
              placeholder="5 Years"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">Address</h3>

        <div className="grid gap-5 md:grid-cols-2">
          <textarea
            rows={4}
            className="rounded-xl border px-4 py-3"
            placeholder="Full Address"
          />

          <div className="grid gap-5">
            <input className="rounded-xl border px-4 py-3" placeholder="City" />

            <input
              className="rounded-xl border px-4 py-3"
              placeholder="State"
            />

            <input
              className="rounded-xl border px-4 py-3"
              placeholder="Pincode"
            />
          </div>
        </div>
      </div>

      {/* License */}
      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Driving License
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="License Number"
          />

          <input type="date" className="rounded-xl border px-4 py-3" />

          <input type="date" className="rounded-xl border px-4 py-3" />
        </div>
      </div>

      {/* Vehicle */}
      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Vehicle Details
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Vehicle Name"
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Vehicle Number"
          />

          <select className="rounded-xl border px-4 py-3">
            <option>Available</option>
            <option>On Trip</option>
            <option>Offline</option>
          </select>
        </div>
      </div>

      {/* Banking */}
      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Bank Details
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Bank Name"
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="Account Number"
          />

          <input
            className="rounded-xl border px-4 py-3"
            placeholder="IFSC Code"
          />
        </div>
      </div>
    </form>
  );
}
