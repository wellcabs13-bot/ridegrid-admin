"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SuccessDraft = {
  bookingId: string;
  bookingNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    pickupAddress?: string;
    dropAddress?: string;
  };
  vehicle?: {
    make?: string;
    model?: string;
    year?: number | null;
    category?: string;
    seatingCapacity?: number;
  } | null;
  serviceType?: string;
  tripType?: string;
  date?: string;
  time?: string;
  totalFare?: number;
  discountAmount?: number;
  couponCode?: string | null;
};

function currency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function label(value?: string) {
  if (!value) return "—";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MarketplaceBookingSuccessClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [data, setData] = useState<SuccessDraft | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ridegrid_marketplace_booking_success");

      if (raw) {
        setData(JSON.parse(raw) as SuccessDraft);
        return;
      }

      const bookingId = params.get("bookingId") || "";
      const bookingNumber = params.get("bookingNumber") || "";

      if (bookingId && bookingNumber) {
        setData({
          bookingId,
          bookingNumber,
          paymentMethod: "CASH",
          paymentStatus: "PENDING",
        });
      }
    } catch {
      // Keep the page usable with the booking number from the URL.
    }
  }, [params]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Booking Confirmation</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your booking confirmation details are unavailable in this browser session.
          </p>
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-black text-white"
          >
            Back to Marketplace
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="overflow-hidden rounded-[2rem] border bg-white shadow-xl">
          <div className="bg-slate-950 px-8 py-12 text-center text-white">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-4xl text-slate-950 shadow-lg">
              ✓
            </div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
              RideGrid Booking
            </p>
            <h1 className="mt-2 text-4xl font-black">Booking Successful!</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Your vehicle has been successfully booked. Please pay the payable amount
              in cash at pickup as per the selected payment method.
            </p>
            <div className="mx-auto mt-6 inline-flex rounded-full bg-white/10 px-5 py-2 text-sm font-black">
              Booking #{data.bookingNumber}
            </div>
          </div>

          <div className="grid gap-6 p-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <section className="rounded-3xl border bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                      Confirmed Vehicle
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">
                      {data.vehicle?.make || "Vehicle"} {data.vehicle?.model || ""}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {data.vehicle?.year || "—"} • {label(data.vehicle?.category)} •{" "}
                      {data.vehicle?.seatingCapacity || "—"} Seats
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                    CONFIRMED
                  </span>
                </div>
              </section>

              <section className="rounded-3xl border p-6">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">
                  Journey
                </p>
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Pickup</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {data.customer?.pickupAddress || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Drop</p>
                    <p className="mt-1 font-bold text-slate-800">
                      {data.customer?.dropAddress || "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-5 border-t pt-5 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Date</p>
                    <p className="mt-1 font-black text-slate-800">{data.date || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Time</p>
                    <p className="mt-1 font-black text-slate-800">{data.time || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">Trip</p>
                    <p className="mt-1 font-black text-slate-800">{label(data.tripType)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                  Payment
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-900">Cash on Pickup</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Payment status: Pending until cash is collected.
                    </p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">
                    {currency(Number(data.totalFare || 0))}
                  </p>
                </div>
              </section>
            </div>

            <aside className="rounded-3xl border bg-slate-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-300">
                Booking Reference
              </p>
              <p className="mt-3 break-all text-xl font-black">{data.bookingNumber}</p>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-6">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Status</span>
                  <span className="font-black text-emerald-300">Confirmed</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Payment</span>
                  <span className="font-black">Cash on Pickup</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-4">
                  <span className="font-black">Payable</span>
                  <span className="text-2xl font-black">
                    {currency(Number(data.totalFare || 0))}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push("/marketplace")}
                className="mt-8 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-black text-slate-950 hover:bg-cyan-300"
              >
                Back to Marketplace
              </button>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
