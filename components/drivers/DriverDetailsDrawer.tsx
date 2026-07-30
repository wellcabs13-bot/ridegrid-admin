'use client';

import Image from 'next/image';
import { ReactNode } from 'react';
import { Driver } from '../../data/drivers';

interface DriverDetailsDrawerProps {
  driver: Driver | null;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function DriverDetailsDrawer({
  driver,
  isOpen,
  onClose,
  children,
}: DriverDetailsDrawerProps) {
  if (!isOpen || !driver) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Right Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full justify-end">
        <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border">
                  <Image
                    src={driver.photo}
                    alt={driver.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                    priority
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {driver.name}
                  </h2>

                  <p className="text-sm text-slate-500">
                    {driver.mobile}
                  </p>

                  <div className="mt-2 flex gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        driver.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : driver.status === 'Inactive'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {driver.status}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        driver.availability === 'Available'
                          ? 'bg-blue-100 text-blue-700'
                          : driver.availability === 'On Trip'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {driver.availability}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}