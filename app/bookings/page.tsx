 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Edit3,
  Eye,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  X,
  XCircle,
  Radio,
  Save,
} from "lucide-react";

type Booking = {
  id: string;
  bookingNumber: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    user?: { email?: string | null; mobile?: string | null } | null;
  };
  vendor: {
    id: string;
    companyName: string;
    user?: { mobile?: string | null; email?: string | null } | null;
  };
  corporate?: {
    id: string;
    companyName: string;
  } | null;
  bookingSource: "WEBSITE" | "APP" | "CORPORATE";
  vehicle: {
    id: string;
    make: string;
    model: string;
    variant?: string | null;
    registrationNumber: string;
    year?: number | null;
  };
  driver?: {
    id: string;
    firstName: string;
    lastName: string;
    user?: { mobile?: string | null } | null;
  } | null;
  pickupLocation: string;
  dropLocation: string;
  pickupDateTime: string;
  tripType?: string;
  status: string;
  estimatedFare: number | string;
  baseFare?: number | string | null;
  discountAmount?: number | string | null;
  extraCharges?: number | string | null;
  finalFare?: number | string | null;
  transactions?: Transaction[];
  pricingPackageId?: string | null;
};

type Transaction = {
  id: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number | string;
  currency: string;
  createdAt: string;
};

type OptionItem = {
  id: string;
  label: string;
  detail?: string;
};

const bookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "DRIVER_ASSIGNED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "CANCELLED",
];

const paymentStatuses = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];

function money(value: unknown) {
  return `â‚¹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "â€”" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "â€”" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function bookingStatusClass(status: string) {
  switch (status) {
    case "CONFIRMED": return "bg-blue-50 text-blue-700 border-blue-200";
    case "DRIVER_ASSIGNED": return "bg-violet-50 text-violet-700 border-violet-200";
    case "TRIP_STARTED": return "bg-orange-50 text-orange-700 border-orange-200";
    case "TRIP_COMPLETED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "CANCELLED": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function paymentStatusClass(status: string) {
  switch (status) {
    case "PAID": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "FAILED": return "bg-red-50 text-red-700 border-red-200";
    case "REFUNDED": return "bg-violet-50 text-violet-700 border-violet-200";
    case "PARTIAL": return "bg-orange-50 text-orange-700 border-orange-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [selected, setSelected] = useState<Booking | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Unable to load bookings.");
      setBookings(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookings.filter((b) => {
      const customer = `${b.customer?.firstName || ""} ${b.customer?.lastName || ""}`.trim();
      const vehicle = `${b.vehicle?.make || ""} ${b.vehicle?.model || ""}`.trim();
      const searchable = [
        b.bookingNumber, b.id, customer, b.customer?.user?.mobile, b.customer?.user?.email,
        vehicle, b.vehicle?.registrationNumber, b.vendor?.companyName,
        b.corporate?.companyName, b.bookingSource,
        b.pickupLocation, b.dropLocation,
      ].filter(Boolean).join(" ").toLowerCase();
      const tx = b.transactions?.[0];
      return (!query || searchable.includes(query)) &&
        (!status || b.status === status) &&
        (!payment || tx?.paymentStatus === payment);
    });
  }, [bookings, search, status, payment]);

  const stats = useMemo(() => {
    const revenue = bookings.reduce((s, b) => s + Number(b.finalFare ?? b.estimatedFare ?? 0), 0);
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => ["CONFIRMED", "DRIVER_ASSIGNED"].includes(b.status)).length,
      running: bookings.filter((b) => b.status === "TRIP_STARTED").length,
      completed: bookings.filter((b) => b.status === "TRIP_COMPLETED").length,
      revenue,
      pending: bookings.reduce((s, b) => b.transactions?.[0]?.paymentStatus === "PENDING" ? s + Number(b.transactions[0].amount || 0) : s, 0),
    };
  }, [bookings]);

  async function cancelBooking(booking: Booking) {
    if (booking.status === "CANCELLED" || booking.status === "TRIP_COMPLETED") return;
    if (!window.confirm(`Cancel booking ${booking.bookingNumber}?`)) return;
    try {
      setActionLoading(booking.id);
      const r = await fetch("/api/bookings/cancel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, reason: "Cancelled from Booking Management.", cancelledBy: "ADMIN" }),
      });
      const result = await r.json();
      if (!r.ok || !result.success) throw new Error(result.message || "Booking cancellation failed.");
      setActionMessage(`Booking ${booking.bookingNumber} cancelled.`);
      setSelected(null);
      await loadBookings();
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Booking cancellation failed.");
    } finally { setActionLoading(""); }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Operations</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Booking Management</h1>
            <p className="mt-1 text-sm text-slate-500">Live bookings from the RideGrid database. No demo booking data.</p>
          </div>
          <button onClick={loadBookings} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""}/> Refresh
          </button>
        </div>

        {actionMessage && <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">{actionMessage}</div>}
        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<CalendarDays size={21}/>} title="Total Bookings" value={stats.total.toLocaleString()} detail="All active database bookings"/>
          <StatCard icon={<CheckCircle2 size={21}/>} title="Confirmed" value={stats.confirmed.toLocaleString()} detail="Confirmed + driver assigned"/>
          <StatCard icon={<CarFront size={21}/>} title="Running Trips" value={stats.running.toLocaleString()} detail="Currently in progress"/>
          <StatCard icon={<CircleDollarSign size={21}/>} title="Booking Value" value={money(stats.revenue)} detail="Final fare / estimated fare"/>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <MiniMetric label="Completed Trips" value={stats.completed} note="TRIP_COMPLETED"/>
          <MiniMetric label="Pending Cash / Payment" value={money(stats.pending)} note="Transactions currently pending"/>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Live Booking Records</h2>
                <p className="mt-1 text-sm text-slate-500">Showing {filteredBookings.length} of {bookings.length} real bookings</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative min-w-[280px]">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Booking, customer, vehicle, route..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-500"/>
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none">
                  <option value="">All Booking Status</option>
                  {bookingStatuses.map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
                </select>
                <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none">
                  <option value="">All Payment Status</option>
                  {paymentStatuses.map((x) => <option key={x} value={x}>{statusLabel(x)}</option>)}
                </select>
              </div>
            </div>
          </div>

          {loading ? <div className="p-16 text-center text-sm font-semibold text-slate-500">Loading real bookings...</div> :
          filteredBookings.length === 0 ? <div className="p-16 text-center"><CalendarDays className="mx-auto text-slate-400"/><h3 className="mt-4 text-lg font-black text-slate-900">No bookings found</h3></div> :
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full">
              <thead className="bg-slate-50"><tr>{["Booking","Source","Customer","Vehicle","Journey","Date & Time","Fare","Booking Status","Payment","Actions"].map((h)=><th key={h} className="whitespace-nowrap border-b border-slate-200 px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider text-slate-500">{h}</th>)}</tr></thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const tx=b.transactions?.[0];
                  const customer=`${b.customer?.firstName||""} ${b.customer?.lastName||""}`.trim();
                  return <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="px-5 py-5"><p className="font-black text-slate-900">{b.bookingNumber}</p><p className="mt-1 text-[11px] text-slate-400">{b.id}</p></td>
<td className="px-5 py-5">
  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
    {b.bookingSource === "CORPORATE"
      ? `Corporate - ${b.corporate?.companyName || "Corporate"}`
      : b.bookingSource === "APP"
        ? "App"
        : "Website"}
  </span>
</td>
                    <td className="px-5 py-5"><p className="font-bold text-slate-800">{customer||"â€”"}</p><p className="mt-1 text-xs text-slate-500">{b.customer?.user?.mobile||b.customer?.user?.email||"No contact"}</p></td>
                    <td className="px-5 py-5"><p className="font-bold text-slate-800">{b.vehicle?.make} {b.vehicle?.model}</p><p className="mt-1 text-xs text-slate-500">{b.vehicle?.registrationNumber}</p></td>
                    <td className="max-w-[280px] px-5 py-5"><div className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-emerald-600"/><span className="line-clamp-2 text-sm text-slate-700">{b.pickupLocation}</span></div><div className="mt-2 flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-red-500"/><span className="line-clamp-2 text-sm text-slate-700">{b.dropLocation}</span></div></td>
                    <td className="whitespace-nowrap px-5 py-5"><p className="font-bold text-slate-800">{formatDate(b.pickupDateTime)}</p><p className="mt-1 text-xs text-slate-500">{formatTime(b.pickupDateTime)}</p></td>
                    <td className="whitespace-nowrap px-5 py-5"><p className="text-lg font-black text-slate-900">{money(b.finalFare??b.estimatedFare)}</p></td>
                    <td className="px-5 py-5"><span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${bookingStatusClass(b.status)}`}>{statusLabel(b.status)}</span></td>
                    <td className="px-5 py-5"><span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${paymentStatusClass(tx?.paymentStatus||"PENDING")}`}>{statusLabel(tx?.paymentStatus||"PENDING")}</span><p className="mt-1 text-xs text-slate-400">{statusLabel(tx?.paymentMethod||"â€”")}</p></td>
                    <td className="px-5 py-5"><div className="flex items-center gap-2">
                      <button onClick={()=>setSelected(b)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"><Eye size={14}/> View</button>
                      <button onClick={()=>setEditing(b)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"><Edit3 size={14}/> Edit</button>
                      {b.status!=="CANCELLED"&&b.status!=="TRIP_COMPLETED"&&<button disabled={actionLoading===b.id} onClick={()=>cancelBooking(b)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"><XCircle size={14}/> Cancel</button>}
                    </div></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>}
        </section>
      </div>

      {selected && <ViewModal booking={selected} onClose={()=>setSelected(null)} onEdit={()=>{setEditing(selected);setSelected(null)}} onCancel={()=>cancelBooking(selected)} actionLoading={actionLoading===selected.id}/>}

      {editing && <EditBookingModal booking={editing} onClose={()=>setEditing(null)} onSaved={async()=>{setEditing(null);setActionMessage(`Booking ${editing.bookingNumber} updated successfully.`);await loadBookings();}}/>}
    </DashboardLayout>
  );
}

function ViewModal({booking,onClose,onEdit,onCancel,actionLoading}:{booking:Booking;onClose:()=>void;onEdit:()=>void;onCancel:()=>void;actionLoading:boolean}) {
  const driverPhone=booking.driver?.user?.mobile;
  const vendorPhone=booking.vendor?.user?.mobile;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Booking Details</p><h2 className="mt-1 text-2xl font-black text-slate-900">{booking.bookingNumber}</h2></div><button onClick={onClose} className="rounded-xl border p-2 text-slate-500"><X size={18}/></button></div>
      <div className="grid gap-5 p-6 md:grid-cols-2">
        <DetailCard title="Customer" icon={<UserRound size={18}/>}><p className="font-black text-slate-900">{booking.customer.firstName} {booking.customer.lastName}</p><p className="text-sm text-slate-500">{booking.customer.user?.mobile||"Mobile not available"}</p><p className="text-sm text-slate-500">{booking.customer.user?.email||"Email not available"}</p></DetailCard>
        <DetailCard title="Vehicle & Assignment" icon={<CarFront size={18}/>}><p className="font-black text-slate-900">{booking.vehicle.make} {booking.vehicle.model}</p><p className="text-sm text-slate-500">{booking.vehicle.registrationNumber}</p><p className="mt-2 text-sm font-semibold text-slate-700">Vendor: {booking.vendor.companyName}</p>{vendorPhone?<a href={`tel:${vendorPhone}`} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"><Phone size={13}/> {vendorPhone}</a>:<p className="text-xs text-slate-400">Vendor phone not available</p>}<p className="mt-2 text-sm text-slate-700">Driver: {booking.driver?`${booking.driver.firstName} ${booking.driver.lastName}`:"Not assigned"}</p>{driverPhone?<a href={`tel:${driverPhone}`} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600"><Phone size={13}/> {driverPhone}</a>:<p className="text-xs text-slate-400">Driver phone not available</p>}</DetailCard>
        <DetailCard title="Journey" icon={<MapPin size={18}/>}><p className="text-sm font-bold text-slate-800">Pickup: {booking.pickupLocation}</p><p className="mt-3 text-sm font-bold text-slate-800">Drop: {booking.dropLocation}</p><p className="mt-3 text-sm text-slate-500">{formatDate(booking.pickupDateTime)} at {formatTime(booking.pickupDateTime)}</p></DetailCard>
        <DetailCard title="Fare & Payment" icon={<CircleDollarSign size={18}/>}><SummaryLine label="Base Fare" value={money(booking.baseFare??booking.estimatedFare)}/><SummaryLine label="Discount" value={`âˆ’ ${money(booking.discountAmount)}`}/><SummaryLine label="Extra Charges" value={money(booking.extraCharges)}/><SummaryLine label="Final Fare" value={money(booking.finalFare??booking.estimatedFare)} strong/>{booking.transactions?.[0]&&<><SummaryLine label="Payment" value={statusLabel(booking.transactions[0].paymentMethod)}/><SummaryLine label="Payment Status" value={statusLabel(booking.transactions[0].paymentStatus)}/></>}</DetailCard>
      </div>
      <div className="border-t bg-slate-50 px-6 py-5 flex flex-wrap justify-between gap-3"><div className="flex gap-2"><button onClick={onEdit} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white"><Edit3 size={16}/> Edit Booking</button><button onClick={()=>alert("Live Tracking will be connected in the Live Tracking module.")} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-black text-blue-700"><Radio size={16}/> Live Tracking</button></div>{booking.status!=="CANCELLED"&&booking.status!=="TRIP_COMPLETED"&&<button disabled={actionLoading} onClick={onCancel} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white"><XCircle size={16}/> Cancel Booking</button>}</div>
    </div>
  </div>
}

function EditBookingModal({booking,onClose,onSaved}:{booking:Booking;onClose:()=>void;onSaved:()=>Promise<void>}) {
  type CustomerOpt={id:string;label:string;mobile:string|null;email:string|null;active:boolean};
  type VendorOpt={id:string;label:string;mobile:string|null;email:string|null;active:boolean};
  type VehicleOpt={id:string;vendorId:string;driverId:string|null;label:string;detail:string;status:string;registrationNumber:string;make:string;model:string;variant:string|null;year:number|null;category:string;fuelType:string;transmission:string;seatingCapacity:number;luggageCapacity:number|null;color:string|null};
  type DriverOpt={id:string;vendorId:string;label:string;detail:string;mobile:string|null;email:string|null;status:string};
  type PackageOpt={id:string;vehicleId:string;vendorId:string;label:string;packageType:string;pricingType:string;tripType:string;chargeType:string;city:string|null;fromCity:string|null;toCity:string|null;airportName:string|null;transferDirection:string|null;includedHours:number|null;includedKm:number|null;baseFare:number;extraKmRate:number|null;extraHourRate:number|null;driverAllowance:number|null;nightCharge:number|null;tollCharge:number|null;parkingCharge:number|null;otherCharges:number|null;extraPickupCharge:number|null;extraDropCharge:number|null};
  type EditData={customers:CustomerOpt[];vendors:VendorOpt[];vehicles:VehicleOpt[];drivers:DriverOpt[];packages:PackageOpt[]};
  const [data,setData]=useState<EditData|null>(null);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [form,setForm]=useState({customerId:booking.customer.id,vendorId:booking.vendor.id,vehicleId:booking.vehicle.id,driverId:booking.driver?.id||"",pickupLocation:booking.pickupLocation,dropLocation:booking.dropLocation,pickupDateTime:toLocalInput(booking.pickupDateTime),pricingPackageId:"",tripType:booking.tripType||"ONEWAY",status:booking.status});
  useEffect(()=>{(async()=>{try{const r=await fetch(`/api/bookings/edit-options?bookingId=${encodeURIComponent(booking.id)}`,{cache:"no-store"}),j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Unable to load booking options.");setData(j.data);const current=j.data.packages.find((p:PackageOpt)=>p.id===j.data.booking.pricingPackageId)||j.data.packages.find((p:PackageOpt)=>p.vehicleId===booking.vehicle.id&&p.tripType===booking.tripType);setForm(f=>({...f,pricingPackageId:current?.id||""}))}catch(e){setError(e instanceof Error?e.message:"Unable to load booking options.")}finally{setLoading(false)}})()},[booking]);
  const set=(k:keyof typeof form,v:string)=>setForm(f=>({...f,[k]:v}));
  const vendors=data?.vendors||[], vehicles=(data?.vehicles||[]).filter(v=>v.vendorId===form.vendorId), drivers=(data?.drivers||[]).filter(d=>d.vendorId===form.vendorId), packages=(data?.packages||[]).filter(p=>p.vendorId===form.vendorId&&p.vehicleId===form.vehicleId);
  const vehicle=vehicles.find(v=>v.id===form.vehicleId)||data?.vehicles.find(v=>v.id===form.vehicleId);
  const compatiblePackages=packages.filter(p=>p.tripType===form.tripType);
  const pkg=compatiblePackages.find(p=>p.id===form.pricingPackageId);
  function changeVendor(vendorId:string){const first=(data?.vehicles||[]).find(v=>v.vendorId===vendorId);setForm(f=>({...f,vendorId,vehicleId:first?.id||"",driverId:"",pricingPackageId:""}))}
  function changeVehicle(vehicleId:string){const v=data?.vehicles.find(x=>x.id===vehicleId);setForm(f=>({...f,vehicleId,driverId:v?.driverId||"",pricingPackageId:""}))}
  async function save(){setError("");if(!data)return;if(!form.customerId||!form.vendorId||!form.vehicleId||!form.pickupLocation.trim()||!form.dropLocation.trim()||!form.pickupDateTime)return setError("Customer, vendor, vehicle, pickup, drop and date/time are required.");if(!form.pricingPackageId||!pkg)return setError("Select a valid active Pricing Package for this vendor and vehicle.");const d=new Date(form.pickupDateTime);if(Number.isNaN(d.getTime()))return setError("Invalid pickup date/time.");try{setSaving(true);const r=await fetch("/api/bookings/update",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookingId:booking.id,customerId:form.customerId,vendorId:form.vendorId,vehicleId:form.vehicleId,driverId:form.driverId||null,pickupLocation:form.pickupLocation.trim(),dropLocation:form.dropLocation.trim(),pickupDateTime:d.toISOString(),pricingPackageId:pkg.id,tripType:form.tripType,status:form.status})});const j=await r.json();if(!r.ok||!j.success)throw new Error(j.message||"Booking update failed.");await onSaved()}catch(e){setError(e instanceof Error?e.message:"Booking update failed.")}finally{setSaving(false)}}
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-6 py-5"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Super Admin â€¢ Booking Control Center</p><h2 className="text-2xl font-black text-slate-900">Edit Booking â€” {booking.bookingNumber}</h2><p className="mt-1 text-xs text-slate-400">Booking reference and historical payment records are protected.</p></div><button onClick={onClose} className="rounded-xl border p-2"><X size={18}/></button></div>
    {loading?<div className="p-16 text-center font-semibold text-slate-500">Loading real customer, assignment and pricing data...</div>:<><div className="grid gap-5 p-6 lg:grid-cols-2">
      <EditSection title="Booking Control"><div className="grid grid-cols-2 gap-3"><Read label="Booking Number" value={booking.bookingNumber}/><Field label="Booking Status"><select value={form.status} onChange={e=>set("status",e.target.value)} className="control">{["PENDING","CONFIRMED","DRIVER_ASSIGNED","TRIP_STARTED","TRIP_COMPLETED","CANCELLED"].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></Field><Read label="Current Fare" value={money(booking.finalFare??booking.estimatedFare)}/><Read label="Payment" value={booking.transactions?.[0]?`${statusLabel(booking.transactions[0].paymentMethod)} â€¢ ${statusLabel(booking.transactions[0].paymentStatus)}`:"No transaction"}/></div></EditSection>
      <EditSection title="Customer"><Field label="Customer"><select value={form.customerId} onChange={e=>set("customerId",e.target.value)} className="control">{data?.customers.map(c=><option key={c.id} value={c.id}>{c.label} â€¢ {c.mobile||"No mobile"}</option>)}</select></Field>{(()=>{const c=data?.customers.find(x=>x.id===form.customerId);return c?<p className="mt-2 text-xs text-slate-500">{c.mobile||"No mobile"} â€¢ {c.email||"No email"}</p>:null})()}</EditSection>
      <EditSection title="Journey"><div className="space-y-4"><Field label="Trip Type"><select value={form.tripType} onChange={e=>setForm(f=>({...f,tripType:e.target.value,pricingPackageId:""}))} className="control"><option value="ONEWAY">One Way</option><option value="ROUNDTRIP">Round Trip</option></select></Field><Field label="Pickup Location"><input value={form.pickupLocation} onChange={e=>set("pickupLocation",e.target.value)} className="control"/></Field><Field label="Drop Location"><input value={form.dropLocation} onChange={e=>set("dropLocation",e.target.value)} className="control"/></Field><div className="grid grid-cols-2 gap-3"><Field label="Pickup Date"><input type="date" value={form.pickupDateTime.slice(0,10)} onChange={e=>set("pickupDateTime",`${e.target.value}T${form.pickupDateTime.slice(11,16)}`)} className="control"/></Field><Field label="Pickup Time"><input type="time" value={form.pickupDateTime.slice(11,16)} onChange={e=>set("pickupDateTime",`${form.pickupDateTime.slice(0,10)}T${e.target.value}`)} className="control"/></Field></div></div></EditSection>
      <EditSection title="Vendor â†’ Vehicle â†’ Driver Assignment"><Field label="Approved Vendor"><select value={form.vendorId} onChange={e=>changeVendor(e.target.value)} className="control">{vendors.map(v=><option key={v.id} value={v.id}>{v.label} â€¢ {v.mobile||"No mobile"}</option>)}</select></Field><div className="mt-4"><Field label="Eligible Vehicle"><select value={form.vehicleId} onChange={e=>changeVehicle(e.target.value)} className="control"><option value="">Select vehicle</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></Field>{vehicle&&<div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><b>{vehicle.make} {vehicle.model}{vehicle.variant?` ${vehicle.variant}`:""}</b> â€¢ {vehicle.registrationNumber}<br/>{vehicle.category} â€¢ {vehicle.seatingCapacity} seats â€¢ {vehicle.fuelType} â€¢ {vehicle.transmission} â€¢ {vehicle.status}</div>}</div><div className="mt-4"><Field label="Active Driver"><select value={form.driverId} onChange={e=>set("driverId",e.target.value)} className="control"><option value="">No driver assigned</option>{drivers.map(d=><option key={d.id} value={d.id}>{d.label} â€¢ {d.mobile||"No mobile"}</option>)}</select></Field>{form.driverId&&<p className="mt-2 text-xs font-semibold text-blue-600">{drivers.find(d=>d.id===form.driverId)?.mobile||"Driver phone not available"}</p>}</div></EditSection>
      <EditSection title="Pricing Package (Source of Truth)"><Field label="Active Pricing Package"><select value={form.pricingPackageId} onChange={e=>set("pricingPackageId",e.target.value)} className="control"><option value="">Select pricing package</option>{compatiblePackages.map(p=><option key={p.id} value={p.id}>{p.label} â€¢ {p.pricingType} â€¢ {p.tripType} â€¢ {money(p.baseFare)}</option>)}</select></Field>{pkg?<div className="mt-4 rounded-2xl border bg-slate-50 p-4"><div className="flex justify-between gap-3"><div><p className="font-black">{pkg.label}</p><p className="text-xs text-slate-500">{pkg.pricingType} â€¢ {pkg.tripType} â€¢ {pkg.chargeType}</p>{pkg.fromCity&&pkg.toCity&&<p className="text-xs text-slate-500">{pkg.fromCity} â†’ {pkg.toCity}</p>}{pkg.airportName&&<p className="text-xs text-slate-500">{pkg.airportName} â€¢ {pkg.transferDirection}</p>}</div><p className="text-xl font-black">{money(pkg.baseFare)}</p></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><PricingLine label="Included KM" value={pkg.includedKm==null?"â€”":String(pkg.includedKm)}/><PricingLine label="Included Hours" value={pkg.includedHours==null?"â€”":String(pkg.includedHours)}/><PricingLine label="Extra KM" value={money(pkg.extraKmRate)}/><PricingLine label="Extra Hour" value={money(pkg.extraHourRate)}/><PricingLine label="Driver Allowance" value={money(pkg.driverAllowance)}/><PricingLine label="Night" value={money(pkg.nightCharge)}/><PricingLine label="Toll" value={money(pkg.tollCharge)}/><PricingLine label="Parking" value={money(pkg.parkingCharge)}/></div></div>:<p className="mt-3 text-xs text-amber-600">Select an active package. The fare is not manually editable.</p>}</EditSection>
      <EditSection title="Financial Record"><p className="mb-3 text-xs text-slate-500">Existing payment transactions remain untouched. Selecting a new package changes booking fare from the saved package values only.</p><SummaryLine label="Current Base Fare" value={money(booking.baseFare??booking.estimatedFare)}/><SummaryLine label="Discount" value={`âˆ’ ${money(booking.discountAmount)}`}/><SummaryLine label="Current Extra Charges" value={money(booking.extraCharges)}/><SummaryLine label="Current Final Fare" value={money(booking.finalFare??booking.estimatedFare)} strong/></EditSection>
    </div>{error&&<div className="mx-6 mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}<div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-6 py-5"><p className="text-xs text-slate-500">Validation: approved vendor â†’ verified/available vehicle â†’ active driver â†’ active pricing package.</p><div className="flex gap-3"><button onClick={onClose} className="rounded-xl border bg-white px-5 py-3 text-sm font-bold">Cancel</button><button onClick={()=>void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"><Save size={16}/>{saving?"Saving...":"Save Changes"}</button></div></div></>}</div></div>
}

function PricingLine({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-white px-3 py-2"><p className="text-[10px] font-bold uppercase text-slate-400">{label}</p><p className="mt-1 font-black text-slate-700">{value}</p></div>}

function EditSection({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-700">{title}</h3>{children}</section>}

function Read({label,value}:{label?:string;value:string}){return <div className="rounded-xl border bg-slate-50 px-4 py-3"><span className="block text-[10px] font-black uppercase text-slate-400">{label}</span><span className="text-sm font-bold text-slate-700">{value}</span></div>}

function normalize(data: unknown): OptionItem[] {
  if(!Array.isArray(data)) return [];
  return data.map((x:any)=>({id:String(x.id),label:x.companyName||[x.firstName,x.lastName].filter(Boolean).join(" ")||[x.make,x.model].filter(Boolean).join(" ")||x.registrationNumber||"Unnamed",detail:x.mobile||x.user?.mobile||x.registrationNumber||x.email||x.user?.email||""}));
}

function toLocalInput(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return "";const p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>}
function DetailCard({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><div className="flex items-center gap-2 text-blue-600">{icon}<p className="text-xs font-black uppercase tracking-widest">{title}</p></div><div className="mt-4">{children}</div></section>}
function SummaryLine({label,value,strong=false}:{label:string;value:string;strong?:boolean}){return <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-2 last:border-0"><span className="text-sm text-slate-500">{label}</span><span className={strong?"font-black text-slate-900":"font-semibold text-slate-700"}>{value}</span></div>}
function StatCard({icon,title,value,detail}:{icon:React.ReactNode;title:string;value:string;detail:string}){return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">{icon}</div><p className="mt-5 text-sm font-semibold text-slate-500">{title}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-400">{detail}</p></div>}
function MiniMetric({label,value,note}:{label:string;value:number|string;note:string}){return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><div className="mt-2 flex items-end justify-between gap-4"><p className="text-2xl font-black text-slate-900">{typeof value==="number"?value.toLocaleString():value}</p><span className="text-xs font-semibold text-slate-400">{note}</span></div></div>}
