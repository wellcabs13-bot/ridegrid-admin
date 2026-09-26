"use client";

import { useEffect, useState } from "react";

interface Props {
  driverId: string | number;
}

function value(v: unknown) {
  return v === null || v === undefined || v === ""
    ? "—"
    : String(v);
}

function money(v: unknown) {
  const n = Number(v ?? 0);
  return `₹${Number.isFinite(n) ? n.toLocaleString("en-IN") : "0"}`;
}

function date(v: unknown) {
  if (!v) return "—";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleDateString("en-IN");
}

export default function DriverRealDetails({ driverId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/drivers/${encodeURIComponent(driverId)}/details`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load driver details."
          );
        }

        if (!cancelled) {
          setData(result.data);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load driver details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [driverId]);

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500">
        Loading real driver data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl bg-white p-6 text-slate-500">
        No driver data available.
      </div>
    );
  }

  const driver = data.driver || {};
  const summary = data.summary || {};

  const vehicles = driver.vehicles || [];
  const trips = driver.trips || [];
  const bookings = driver.bookings || [];
  const attendance = driver.attendance || [];
  const documents = driver.documents || [];
  const payrolls = driver.payrolls || [];
  const incentives = driver.incentives || [];
  const penalties = driver.penalties || [];
  const performance = driver.performanceReports || [];
  const reviews = driver.reviews || [];

  return (
    <div className="space-y-6">

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          Driver Information
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">First Name</p>
            <p className="font-semibold">{value(driver.firstName)}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Last Name</p>
            <p className="font-semibold">{value(driver.lastName)}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Mobile</p>
            <p className="font-semibold">{value(driver.user?.mobile)}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="break-all font-semibold">
              {value(driver.user?.email)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Date of Birth</p>
            <p className="font-semibold">{date(driver.dateOfBirth)}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Experience</p>
            <p className="font-semibold">{value(driver.experience)}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-sm text-slate-500">Address</p>
            <p className="font-semibold">
              {[
                driver.address,
                driver.city,
                driver.state,
                driver.pincode,
              ].filter(Boolean).join(", ") || "—"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="font-semibold">{value(driver.status)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          KYC & Verification
        </h3>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Driving Licence</p>
            <p className="font-semibold">
              {value(driver.licenseNumber)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Aadhaar</p>
            <p className="font-semibold">
              {value(driver.aadhaarNumber)}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Police Verification
            </p>
            <p className="font-semibold">
              {value(driver.policeVerificationNumber)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          Assigned Vehicle
        </h3>

        {vehicles.length === 0 ? (
          <p className="text-slate-500">
            No vehicle currently assigned.
          </p>
        ) : (
          vehicles.map((vehicle: any) => (
            <div
              key={vehicle.id}
              className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <p className="text-sm text-slate-500">
                  Registration
                </p>
                <p className="font-semibold">
                  {value(vehicle.registrationNumber)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Vehicle
                </p>
                <p className="font-semibold">
                  {[
                    vehicle.make,
                    vehicle.model,
                    vehicle.variant,
                  ].filter(Boolean).join(" ") || "—"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Vendor
                </p>
                <p className="font-semibold">
                  {value(vehicle.vendor?.companyName)}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">
                  Status
                </p>
                <p className="font-semibold">
                  {value(vehicle.status)}
                </p>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            Trip History
          </h3>

          <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            Real Trips: {summary.totalTrips ?? trips.length}
          </span>
        </div>

        {trips.length === 0 && bookings.length === 0 ? (
          <p className="text-slate-500">
            No trip records available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Booking</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Route</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {(trips.length ? trips : bookings).map(
                  (item: any, index: number) => {
                    const booking = item.booking || item;

                    return (
                      <tr
                        key={item.id || index}
                        className="border-b"
                      >
                        <td className="px-4 py-3 font-medium">
                          {value(
                            booking.bookingNumber || item.id
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {date(booking.pickupDateTime)}
                        </td>

                        <td className="px-4 py-3">
                          {[
                            booking.pickupLocation,
                            booking.dropLocation,
                          ].filter(Boolean).join(" → ") || "—"}
                        </td>

                        <td className="px-4 py-3">
                          {money(
                            booking.driverPayout ??
                              booking.finalFare ??
                              booking.estimatedFare
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {value(
                            booking.status || item.status
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          Attendance Summary
        </h3>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Present Days</p>
            <p className="text-2xl font-bold">
              {summary.presentDays ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Absent Days</p>
            <p className="text-2xl font-bold">
              {summary.absentDays ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Working Hours</p>
            <p className="text-2xl font-bold">
              {summary.workingHours ?? 0}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Attendance
            </p>
            <p className="text-2xl font-bold">
              {summary.attendancePercentage ?? 0}%
            </p>
          </div>
        </div>

        {attendance.length === 0 ? (
          <p className="mt-5 text-slate-500">
            No attendance records available.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Check In</th>
                  <th className="px-4 py-3 text-left">Check Out</th>
                </tr>
              </thead>

              <tbody>
                {attendance.map(
                  (item: any, index: number) => (
                    <tr
                      key={item.id || index}
                      className="border-b"
                    >
                      <td className="px-4 py-3">
                        {date(
                          item.attendanceDate || item.date
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {value(item.status)}
                      </td>
                      <td className="px-4 py-3">
                        {date(item.checkIn)}
                      </td>
                      <td className="px-4 py-3">
                        {date(item.checkOut)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          Payment Summary
        </h3>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Driver Earnings
            </p>
            <p className="text-2xl font-bold">
              {money(summary.totalDriverPayout)}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Incentives
            </p>
            <p className="text-2xl font-bold">
              {money(summary.totalIncentives)}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Penalties
            </p>
            <p className="text-2xl font-bold">
              {money(summary.totalPenalties)}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Net Earnings
            </p>
            <p className="text-2xl font-bold">
              {money(summary.netEarnings)}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <p className="text-sm text-slate-500">
            Payroll records: {payrolls.length}
          </p>
          <p className="text-sm text-slate-500">
            Incentive records: {incentives.length}
          </p>
          <p className="text-sm text-slate-500">
            Penalty records: {penalties.length}
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-2 text-xl font-semibold">
          Driver Documents
        </h3>

        <p className="mb-5 text-sm text-slate-500">
          Only real documents stored for this driver are displayed.
        </p>

        {documents.length === 0 ? (
          <p className="text-slate-500">
            No documents uploaded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left">
                    Number
                  </th>
                  <th className="px-4 py-3 text-left">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left">
                    File
                  </th>
                </tr>
              </thead>

              <tbody>
                {documents.map(
                  (doc: any, index: number) => (
                    <tr
                      key={doc.id || index}
                      className="border-b"
                    >
                      <td className="px-4 py-3 font-medium">
                        {value(doc.documentType)}
                      </td>

                      <td className="px-4 py-3">
                        {value(doc.documentNumber)}
                      </td>

                      <td className="px-4 py-3">
                        {value(doc.status)}
                      </td>

                      <td className="px-4 py-3">
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600"
                          >
                            View Document
                          </a>
                        ) : (
                          "No file"
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-xl font-semibold">
          Driver Performance
        </h3>

        {performance.length === 0 ? (
          <p className="text-slate-500">
            No performance records available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">
                    Report Date
                  </th>
                  <th className="px-4 py-3 text-left">
                    Completed Trips
                  </th>
                  <th className="px-4 py-3 text-left">
                    Cancelled Trips
                  </th>
                  <th className="px-4 py-3 text-left">
                    Rating
                  </th>
                </tr>
              </thead>

              <tbody>
                {performance.map(
                  (item: any, index: number) => (
                    <tr
                      key={item.id || index}
                      className="border-b"
                    >
                      <td className="px-4 py-3">
                        {date(item.reportDate)}
                      </td>
                      <td className="px-4 py-3">
                        {value(item.completedTrips)}
                      </td>
                      <td className="px-4 py-3">
                        {value(item.cancelledTrips)}
                      </td>
                      <td className="px-4 py-3">
                        {value(item.rating)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {reviews.length > 0 && (
          <p className="mt-5 text-sm text-slate-500">
            Real customer reviews: {reviews.length}
          </p>
        )}
      </section>

    </div>
  );
}

