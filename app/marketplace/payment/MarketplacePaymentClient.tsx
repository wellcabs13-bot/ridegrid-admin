"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BookingDraft = {
  corporateId?: string | null;
  corporateName?: string | null;
  listingId?: string;
  serviceType?: string;
  tripType?: string;
  pickupCity?: string;
  dropCity?: string;
  date?: string;
  time?: string;
  category?: string;
  packageName?: string;
  airport?: string;
  airportDirection?: string;
  airportSlab?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    mobile?: string;
    email?: string;
    pickupAddress?: string;
    dropAddress?: string;
    specialRequest?: string;
    pickupLatitude?: number | null;
    pickupLongitude?: number | null;
    dropLatitude?: number | null;
    dropLongitude?: number | null;
  };
  vehicle?: {
    make?: string;
    model?: string;
    variant?: string | null;
    year?: number | null;
    category?: string;
    seatingCapacity?: number;
  } | null;
  pricing?: {
    pricingPackageId?: string | null;
    packageName?: string | null;
    baseFare?: number;
    includedHours?: number | null;
    includedKm?: number | null;
  } | null;
  totalFare?: number;
  discountAmount?: number;
  couponId?: string | null;
  couponCode?: string | null;
  finalFare?: number;
};

function currency(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function title(value?: string) {
  if (!value) return "—";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MarketplacePaymentClient() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [method, setMethod] = useState<"CASH" | "ONLINE" | "CORPORATE_CREDIT">("CASH");
  const [corporateAccount, setCorporateAccount] = useState<any>(null);
  const isCorporate = Boolean(draft?.corporateId);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ridegrid_marketplace_booking_draft");
      if (!raw) {
        setMessage("Booking details were not found. Please return to the booking form.");
        return;
      }
      setDraft(JSON.parse(raw) as BookingDraft);
    } catch {
      setMessage("Unable to read your booking details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!draft?.corporateId) {
      setCorporateAccount(null);
      return;
    }

    let cancelled = false;

    const corporateId = draft.corporateId;

    async function loadCorporateCredit() {
      try {
        setMessage("");

        const response = await fetch(
          `/api/corporate/credit-account?corporateId=${encodeURIComponent(
            corporateId as string
          )}`,
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message || "Unable to load corporate credit."
          );
        }

        if (!cancelled) {
          setCorporateAccount(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          setCorporateAccount(null);
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load corporate credit."
          );
        }
      }
    }

    void loadCorporateCredit();

    return () => {
      cancelled = true;
    };
  }, [draft?.corporateId]);

  const originalFare = Number(draft?.totalFare || draft?.pricing?.baseFare || 0);
  const discount = Number(draft?.discountAmount || 0);
  const payable = Number(draft?.finalFare ?? Math.max(originalFare - discount, 0));

  async function confirmCashBooking() {
    if (!draft) return;

    if (!draft.customer?.firstName?.trim() || !draft.customer?.lastName?.trim()) {
      setMessage("Customer name is required.");
      return;
    }

    if (!draft.customer?.mobile?.trim() || !draft.customer?.email?.trim()) {
      setMessage("Customer mobile number and email are required.");
      return;
    }

    if (!draft.customer?.pickupAddress?.trim()) {
      setMessage("Pickup location is required.");
      return;
    }

    if (!draft.customer?.dropAddress?.trim() && draft.serviceType !== "LOCAL") {
      setMessage("Drop location is required.");
      return;
    }

    if (!draft.date || !draft.time) {
      setMessage("Pickup date and time are required.");
      return;
    }

    if (!draft.listingId) {
      setMessage("Selected vehicle is missing.");
      return;
    }

    if (!draft.pricing?.pricingPackageId) {
      setMessage("Selected pricing package is missing. Please return to the listings.");
      return;
    }

    try {
      setBooking(true);
      setMessage("");
      setSuccess("");

      const pickupDateTime = new Date(`${draft.date}T${draft.time}`);

      if (
        Number.isNaN(pickupDateTime.getTime()) ||
        pickupDateTime.getTime() <= Date.now()
      ) {
        setMessage("Pickup date and time must be in the future.");
        return;
      }

      const response = await fetch("/api/marketplace/cash-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId: draft.listingId,
          pricingPackageId: draft.pricing.pricingPackageId,
          serviceType: draft.serviceType,
          tripType: draft.tripType,
          pickupCity: draft.pickupCity,
          dropCity: draft.dropCity,
          pickupAddress: draft.customer.pickupAddress.trim(),
          dropAddress:
            draft.customer.dropAddress?.trim() ||
            draft.customer.pickupAddress.trim(),
          pickupLatitude: draft.customer.pickupLatitude ?? null,
          pickupLongitude: draft.customer.pickupLongitude ?? null,
          dropLatitude: draft.customer.dropLatitude ?? null,
          dropLongitude: draft.customer.dropLongitude ?? null,
          pickupDateTime: pickupDateTime.toISOString(),
          specialRequest: draft.customer.specialRequest?.trim() || "",
          customer: {
            firstName: draft.customer.firstName.trim(),
            lastName: draft.customer.lastName.trim(),
            mobile: draft.customer.mobile.trim(),
            email: draft.customer.email.trim().toLowerCase(),
          },
          couponId: draft.couponId || null,
          paymentMethod: method,
          corporateId: draft.corporateId || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Cash booking could not be created."
        );
      }

      const createdBooking = result.data;

      if (!createdBooking?.id || !createdBooking?.bookingNumber) {
        throw new Error(
          "Booking was created but confirmation details were not returned."
        );
      }

      const successDraft = {
        bookingId: createdBooking.id,
        bookingNumber: createdBooking.bookingNumber,
        paymentMethod: "CASH",
        paymentStatus: "PENDING",
        customer: draft.customer,
        vehicle: draft.vehicle,
        pricing: draft.pricing,
        serviceType: draft.serviceType,
        tripType: draft.tripType,
        date: draft.date,
        time: draft.time,
        pickupCity: draft.pickupCity,
        dropCity: draft.dropCity,
        totalFare: Number(createdBooking.finalFare ?? payable),
        discountAmount: Number(createdBooking.discountAmount ?? discount),
        couponCode: draft.couponCode || null,
      };

      sessionStorage.setItem(
        "ridegrid_marketplace_booking_success",
        JSON.stringify(successDraft)
      );
      sessionStorage.removeItem("ridegrid_marketplace_booking_draft");

      setSuccess("Booking confirmed successfully.");

      router.push(
        `/marketplace/booking/success?bookingId=${encodeURIComponent(
          createdBooking.id
        )}&bookingNumber=${encodeURIComponent(createdBooking.bookingNumber)}`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Cash booking failed."
      );
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-3xl border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-500" />
          <p className="mt-4 font-bold text-slate-700">Preparing payment</p>
        </div>
      </main>
    );
  }

  if (!draft) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl border bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Payment details unavailable</h1>
          <p className="mt-2 text-sm text-red-600">{message}</p>
          <button onClick={() => router.back()} className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 font-black text-white">
            Back to Booking
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <button onClick={() => router.back()} className="text-sm font-bold text-blue-600">
            ← Back to Booking
          </button>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-600">RideGrid Payment</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900">Choose Payment Method</h1>
          <p className="mt-1 text-sm text-slate-500">Select how you want to pay for this booking.</p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Payment Method</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">How would you like to pay?</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setMethod("CASH"); setMessage(""); }}
                  className={`rounded-3xl border-2 p-6 text-left transition ${
                    method === "CASH" ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-3xl">ðŸ’µ</div>
                  <h3 className="mt-3 text-xl font-black text-slate-900">Cash on Pickup</h3>
                  <p className="mt-1 text-sm text-slate-500">Pay the applicable booking amount directly as per RideGrid&apos;s cash-payment policy.</p>
                  {method === "CASH" && <p className="mt-4 text-xs font-black text-cyan-700">✓ SELECTED</p>}
                </button>

                {isCorporate && <button type="button" onClick={() => {setMethod("CORPORATE_CREDIT");setMessage("");}} className={`rounded-3xl border-2 p-6 text-left ${method==="CORPORATE_CREDIT"?"border-cyan-500 bg-cyan-50":"border-slate-200 bg-white"}`}><div className="text-3xl">💳</div><h3 className="mt-3 text-xl font-black">Corporate Credit Account</h3><p className="mt-1 text-sm text-slate-500">Charge this booking to {draft?.corporateName || "the corporate account"}.</p></button>}

                <button
                  type="button"
                  onClick={() => { setMethod("ONLINE"); setMessage(""); }}
                  className={`rounded-3xl border-2 p-6 text-left transition ${
                    method === "ONLINE" ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="text-3xl">ðŸ’³</div>
                  <h3 className="mt-3 text-xl font-black text-slate-900">Online Payment</h3>
                  <p className="mt-1 text-sm text-slate-500">Razorpay checkout will be used for secure online payment.</p>
                  {method === "ONLINE" && <p className="mt-4 text-xs font-black text-cyan-700">✓ SELECTED</p>}
                </button>
              </div>
            </section>

            {method === "CASH" ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="text-xl font-black text-slate-900">Cash on Pickup</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Online payment details are hidden because Cash on Pickup is selected.
                  Your booking will be submitted directly for confirmation.
                </p>
                <button
                  type="button"
                  disabled={booking}
                  onClick={confirmCashBooking}
                  className="mt-6 w-full rounded-2xl bg-cyan-500 px-5 py-4 font-black text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {booking ? "Confirming Booking..." : `Confirm Cash Booking • ${currency(payable)}`}
                </button>
              </section>
            ) : method === "CORPORATE_CREDIT" ? (
              <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-6">
                <h2 className="text-xl font-black">Corporate Credit Account</h2>
                <p className="mt-2 text-sm text-slate-600">{draft?.corporateName}</p>
                {corporateAccount && <div className="mt-4 grid grid-cols-3 gap-3"><CreditStat label="Limit" value={currency(corporateAccount.creditLimit)} /><CreditStat label="Outstanding" value={currency(corporateAccount.outstanding)} /><CreditStat label="Available" value={currency(corporateAccount.availableCredit)} /></div>}
                <button type="button" disabled={booking || !corporateAccount?.enabled || Number(corporateAccount?.availableCredit || 0)<payable} onClick={confirmCashBooking} className="mt-6 w-full rounded-2xl bg-cyan-500 px-5 py-4 font-black disabled:opacity-50">{booking ? "Confirming..." : `Confirm Corporate Credit • ${currency(payable)}`}</button>
              </section>
            ) : (
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6">
                <h2 className="text-xl font-black text-slate-900">Online Payment</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Razorpay integration is kept open here and will be connected after the Cash on Pickup flow is successfully tested.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-6 w-full rounded-2xl bg-slate-300 px-5 py-4 font-black text-slate-600"
                >
                  Razorpay Payment — Coming Next
                </button>
              </section>
            )}

            {message && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>}
            {success && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{success}</div>}
          </div>

          <aside>
            <div className="sticky top-6 rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Booking Summary</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Review</h2>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">VEHICLE</p>
                <p className="mt-1 font-black text-slate-900">
                  {draft.vehicle?.make} {draft.vehicle?.model}
                </p>
                <p className="text-sm text-slate-500">
                  {draft.vehicle?.year || "—"} • {title(draft.vehicle?.category)} • {draft.vehicle?.seatingCapacity || "—"} Seats
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">JOURNEY</p>
                <p className="mt-2 text-sm font-bold text-slate-800">{draft.customer?.pickupAddress}</p>
                <p className="mt-1 text-xs text-slate-400">Pickup</p>
                <p className="mt-3 text-sm font-bold text-slate-800">{draft.customer?.dropAddress || "Local destination"}</p>
                <p className="mt-1 text-xs text-slate-400">Drop</p>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">DATE & TIME</p>
                <p className="mt-1 font-black text-slate-900">{draft.date || "—"} {draft.time || ""}</p>
              </div>

              <div className="mt-5 border-t pt-5 space-y-2">
                <SummaryRow label="Original Fare" value={currency(originalFare)} />
                {discount > 0 && <SummaryRow label={`Coupon ${draft.couponCode ? `(${draft.couponCode})` : ""}`} value={`− ${currency(discount)}`} />}
                <div className="flex items-end justify-between gap-3 border-t pt-4">
                  <span className="font-black text-slate-900">Payable</span>
                  <span className="text-3xl font-black text-slate-900">{currency(payable)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}


function CreditStat({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-black">{value}</p></div>}





