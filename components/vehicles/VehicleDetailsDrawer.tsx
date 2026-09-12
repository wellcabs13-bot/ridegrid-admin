'use client';

import { useEffect, useState } from 'react';
import { Vehicle } from '../../data/vehicles';

interface VehicleDetailsDrawerProps {
  open: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
}

type VehicleDetails = any;

function formatDate(value: unknown) {
  if (!value) return '-';

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-IN');
}

function formatMoney(value: unknown) {
  const number = Number(value || 0);

  return number.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    RC: 'Registration Certificate (RC)',
    INSURANCE: 'Insurance Policy',
    PERMIT: 'National Permit',
    FITNESS: 'Fitness Certificate',
    POLLUTION: 'Pollution Certificate',
    TAX: 'Road Tax Receipt',
    OTHER: 'Other Document',
  };

  return labels[type] || type;
}

export default function VehicleDetailsDrawer({
  open,
  vehicle,
  onClose,
}: VehicleDetailsDrawerProps) {
  const [details, setDetails] =
    useState<VehicleDetails | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!open || !vehicle?.id) {
      setDetails(null);
      setError('');
      return;
    }

    let cancelled = false;
    const vehicleId = vehicle.id;

    async function loadDetails() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(
          "/api/vehicles/" + vehicleId + "/details",
          {
            cache: 'no-store',
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              'Failed to load vehicle details.'
          );
        }

        if (!cancelled) {
          setDetails(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load vehicle details.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [open, vehicle?.id]);

  if (!open || !vehicle) {
    return null;
  }

  const data =
    details || {
      ...vehicle,
      registrationNumber:
        (vehicle as any).registrationNumber ||
        (vehicle as any).registrationNo,
      make:
        (vehicle as any).make ||
        (vehicle as any).brand,
      homeCity:
        (vehicle as any).homeCity ||
        (vehicle as any).city,
      documents: [],
      photos: [],
      bookings: [],
      trips: [],
      maintenance: [],
      vendor: null,
      driver: null,
      earnings: 0,
    };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-4xl overflow-y-auto bg-slate-100 shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Vehicle Details
            </h2>

            <p className="text-sm text-slate-500">
              {data.registrationNumber || '-'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl hover:bg-slate-100"
          >
            Ã—
          </button>
        </div>

        {loading && (
          <div className="m-6 rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow">
            Loading real vehicle data...
          </div>
        )}

        {error && (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6 p-6">
          {/* VEHICLE INFORMATION */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Vehicle Information
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-500">
                  Registration Number
                </p>
                <p className="mt-1 font-semibold">
                  {data.registrationNumber || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Brand
                </p>
                <p className="mt-1 font-semibold">
                  {data.make || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Model
                </p>
                <p className="mt-1 font-semibold">
                  {data.model || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Year
                </p>
                <p className="mt-1">
                  {data.year || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Category
                </p>
                <p className="mt-1">
                  {data.category || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Seating
                </p>
                <p className="mt-1">
                  {data.seatingCapacity || '-'} Seats
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Fuel
                </p>
                <p className="mt-1">
                  {data.fuelType || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Transmission
                </p>
                <p className="mt-1">
                  {data.transmission || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  City
                </p>
                <p className="mt-1">
                  {data.homeCity || '-'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-500">
                  Status
                </p>
                <span className="mt-1 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  {data.status || '-'}
                </span>
              </div>
            </div>
          </section>

          {/* VENDOR / DRIVER */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Owner / Assignment
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-slate-500">
                  Vendor
                </p>

                <p className="mt-2 font-semibold">
                  {data.vendor?.companyName ||
                    data.vendor?.name ||
                    'Not assigned'}
                </p>

                {data.vendor?.mobile && (
                  <p className="mt-1 text-sm text-slate-500">
                    {data.vendor.mobile}
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-slate-500">
                  Driver
                </p>

                <p className="mt-2 font-semibold">
                  {data.driver?.name ||
                    'Not assigned'}
                </p>

                {data.driver?.mobile && (
                  <p className="mt-1 text-sm text-slate-500">
                    {data.driver.mobile}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* PHOTOS */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Vehicle Photos
            </h3>

            {data.photos?.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {data.photos.map(
                  (photo: any) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-xl border bg-slate-50"
                    >
                      <div className="aspect-video bg-slate-100">
                        {photo.mimeType?.startsWith(
                          'image/'
                        ) ? (
                          <img
                            src={photo.fileUrl}
                            alt={
                              photo.fileName ||
                              'Vehicle photo'
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-slate-500">
                            Preview unavailable
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3">
                        <p className="truncate text-sm font-medium">
                          {photo.fileName ||
                            'Vehicle Photo'}
                        </p>

                        <a
                          href={photo.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No vehicle photos uploaded.
              </p>
            )}
          </section>

          {/* DOCUMENTS */}
          <section className="rounded-xl bg-white p-6 shadow">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Vehicle Documents
              </h3>
            </div>

            {data.documents?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.documents.map(
                  (document: any) => (
                    <div
                      key={document.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-medium">
                            {documentLabel(
                              document.documentType
                            )}
                          </h4>

                          <p className="mt-1 text-xs text-slate-500">
                            {document.documentNumber ||
                              'No document number'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Uploaded:{' '}
                            {formatDate(
                              document.createdAt
                            )}
                          </p>

                          {document.expiryDate && (
                            <p className="mt-1 text-xs text-slate-500">
                              Expiry:{' '}
                              {formatDate(
                                document.expiryDate
                              )}
                            </p>
                          )}
                        </div>

                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          {document.status || 'PENDING'}
                        </span>
                      </div>

                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        View Document
                      </a>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No vehicle documents uploaded.
              </p>
            )}
          </section>

          {/* FINANCE */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Vehicle Financial Summary
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Base Fare
                </p>
                <p className="mt-1 font-bold">
                  {formatMoney(data.baseFare)}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Price / KM
                </p>
                <p className="mt-1 font-bold">
                  {data.pricePerKm !== null &&
                  data.pricePerKm !== undefined
                    ? formatMoney(
                        data.pricePerKm
                      )
                    : '-'}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Recorded Earnings
                </p>
                <p className="mt-1 font-bold">
                  {formatMoney(data.earnings)}
                </p>
              </div>
            </div>
          </section>

          {/* TRIP HISTORY */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Trip History
            </h3>

            {data.bookings?.length ? (
              <div className="space-y-3">
                {data.bookings.map(
                  (booking: any) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {booking.bookingNumber ||
                              booking.id}
                          </p>

                          <p className="text-sm text-slate-500">
                            {booking.customer ||
                              'Customer'}
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {booking.status || '-'}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                        <p>
                          From:{' '}
                          {booking.pickupLocation ||
                            '-'}
                        </p>

                        <p>
                          To:{' '}
                          {booking.dropLocation ||
                            '-'}
                        </p>

                        <p>
                          Amount:{' '}
                          {formatMoney(
                            booking.amount
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No trips recorded for this vehicle.
              </p>
            )}
          </section>

          {/* MAINTENANCE */}
          <section className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-5 text-lg font-bold">
              Maintenance History
            </h3>

            {data.maintenance?.length ? (
              <div className="space-y-3">
                {data.maintenance.map(
                  (record: any) => (
                    <div
                      key={record.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">
                          {record.maintenanceType ||
                            'Maintenance'}
                        </p>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {record.status || '-'}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 text-sm text-slate-500 md:grid-cols-3">
                        <p>
                          Date:{' '}
                          {formatDate(
                            record.serviceDate
                          )}
                        </p>

                        <p>
                          Workshop:{' '}
                          {record.workshopName ||
                            '-'}
                        </p>

                        <p>
                          Cost:{' '}
                          {formatMoney(
                            record.cost
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No maintenance records found.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
