"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Confirm, Drawer, Empty, Field, Notice, Pager, Pill, Rows, Section, inr, num, send, when, words } from "@/components/admin/kit";
import AddVendorModal from "@/components/vendors/AddVendorModal";
import VendorForm, { VendorFormData } from "@/components/vendors/VendorForm";
import ResetLoginPassword from "@/components/admin/ResetLoginPassword";
import { Plus, RefreshCw } from "lucide-react";

type Row = {
  id: string; companyName: string; city: string | null; contact: string; email: string; mobile: string | null; state: string; verified: boolean;
  suspendedAt: string | null; suspensionReason: string | null; joined: string; activeVehicles: number; totalVehicles: number; activeDrivers: number;
  trips: number; completed: number; current: number; grossValue: number; earned: number; paid: number; outstanding: number; marketplaceVehicles: number;
};
type List = { rows: Row[]; total: number; page: number; totalPages: number };

async function upload(file: File | null) {
  if (!file) return null;
  const form = new FormData(); form.append("file", file);
  const response = await fetch("/api/files/upload", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || "File upload failed.");
  return { fileName: file.name, mimeType: file.type, fileSize: file.size, fileUrl: result.data.fileUrl, storageKey: result.data.storageKey };
}

export default function VendorsPage() {
  const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [applied, setApplied] = useState<{ status: string; q: string } | null>(null);
  const [page, setPage] = useState(1); const [data, setData] = useState<List | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null); const [notice, setNotice] = useState("");
  const [form, setForm] = useState<{ id: string | null; initial?: Partial<VendorFormData> } | null>(null); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");

  useEffect(() => { const s = new URLSearchParams(window.location.search).get("status") ?? ""; setStatus(s); setApplied({ status: s, q: "" }); }, []);
  const query = useMemo(() => applied && new URLSearchParams({ ...(applied.status ? { status: applied.status } : {}), ...(applied.q ? { q: applied.q } : {}), page: String(page) }).toString(), [applied, page]);
  const load = useCallback(async () => {
    if (!query) return;
    setLoading(true); setError("");
    try { setData(await send<List>(`/api/admin/vendors?${query}`, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load vendors."); } finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  const openEdit = async (id: string) => {
    setFormError("");
    try {
      const d = await send<{ vendor: Record<string, string | number | null> }>(`/api/vendors/details?vendorId=${encodeURIComponent(id)}`, "GET");
      const v = d.vendor; const s = (k: string) => (v[k] == null ? "" : String(v[k]));
      setForm({ id, initial: { companyName: s("companyName"), ownerName: s("ownerName"), mobile: s("mobile"), email: s("email"), homeCity: s("homeCity"), fleetSize: s("fleetSize"), address: s("address"), city: s("city"), state: s("state"), pinCode: s("pinCode"), bankName: s("bankName"), accountNumber: s("accountNumber"), ifscCode: s("ifscCode"), branchName: s("branchName") } });
    } catch (e) { setNotice(""); setError(e instanceof Error ? e.message : "Unable to load vendor."); }
  };

  const save = async (f: VendorFormData) => {
    setSaving(true); setFormError("");
    try {
      const documents = { aadhaarCard: await upload(f.aadhaarCard), panCard: await upload(f.panCard), cancelledCheque: await upload(f.cancelledCheque) };
      const body = { companyName: f.companyName, ownerName: f.ownerName, mobile: f.mobile, email: f.email, homeCity: f.homeCity, fleetSize: f.fleetSize, address: f.address, city: f.city, state: f.state, pinCode: f.pinCode, bankName: f.bankName, accountNumber: f.accountNumber, ifscCode: f.ifscCode, branchName: f.branchName, documents };
      await send("/api/vendors", form?.id ? "PUT" : "POST", form?.id ? { id: form.id, ...body } : body);
      setNotice(form?.id ? "Vendor updated." : "Vendor added. It stays hidden from the marketplace until verified."); setForm(null); await load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Unable to save vendor."); } finally { setSaving(false); }
  };

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Vendors" description="Fleet partners, their verification and suspension state, fleet, trips and payables. Only verified, active vendors appear in the marketplace.">
      <button className="rg-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button>
      <button className="rg-primary" onClick={() => { setFormError(""); setForm({ id: null }); }}><Plus size={15} />Add vendor</button>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ status, q: q.trim() }); }}>
      <Field label="Search"><input className="rg-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Company, contact, email, mobile, city" /></Field>
      <Field label="Status"><select className="rg-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">All (not deleted)</option><option value="ACTIVE">Active</option><option value="VERIFIED">Verified</option><option value="PENDING">Awaiting verification</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option></select></Field>
      <div className="flex items-end"><button className="rg-primary" type="submit">Apply</button></div>
    </form></section>
    {error ? <Notice tone="error">{error}</Notice> : <section className="rg-card">
      {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Loading vendors…</p> : !data?.rows.length ? <Empty title="No vendors found" text="Add a vendor, then verify it to make its fleet bookable." /> :
        <div className="overflow-x-auto"><table className="rg-table min-w-[1400px]"><thead><tr><th>Vendor</th><th>Contact</th><th>Status</th><th>Joined</th><th className="text-right">Vehicles / drivers</th><th className="text-right">Trips (done · current)</th><th className="text-right">Gross value</th><th className="text-right">Earned · paid</th><th className="text-right">Outstanding</th><th className="text-right">In marketplace</th></tr></thead>
          <tbody>{data.rows.map(v => <tr key={v.id} className="cursor-pointer" onClick={() => setOpen(v.id)}>
            <td><button className="font-semibold text-red-700 hover:underline">{v.companyName}</button><p className="text-xs text-neutral-500">{v.city ?? "—"}</p></td>
            <td><p>{v.contact}</p><p className="text-xs text-neutral-500">{v.mobile ?? "—"} · {v.email}</p></td>
            <td><div className="flex flex-wrap gap-1"><Pill value={v.state} label={v.state === "PENDING" ? "Awaiting verification" : undefined} />{v.verified && <Pill value="VERIFIED" />}</div>{v.suspensionReason && <p className="mt-1 max-w-[180px] truncate text-[11px] text-neutral-500" title={v.suspensionReason}>{v.suspensionReason}</p>}</td>
            <td className="whitespace-nowrap text-xs">{when(v.joined, false)}</td>
            <td className="text-right">{num(v.activeVehicles)}/{num(v.totalVehicles)} · {num(v.activeDrivers)}</td>
            <td className="text-right">{num(v.trips)} <span className="text-xs text-neutral-500">({num(v.completed)} · {num(v.current)})</span></td>
            <td className="text-right">{inr(v.grossValue)}</td><td className="text-right text-xs">{inr(v.earned)} · {inr(v.paid)}</td>
            <td className="text-right font-semibold">{inr(v.outstanding)}</td>
            <td className="text-right">{v.marketplaceVehicles ? `${v.marketplaceVehicles} vehicle(s)` : <span className="text-xs text-neutral-500">Not listed</span>}</td>
          </tr>)}</tbody></table></div>}
      {data && data.rows.length > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </section>}
    <VendorDrawer id={open} onClose={() => setOpen(null)} onEdit={id => void openEdit(id)} onChanged={m => { setNotice(m); void load(); }} />
    <AddVendorModal isOpen={!!form} title={form?.id ? "Edit vendor" : "Add vendor"} onClose={() => { if (!saving) setForm(null); }}>
      {formError && <div className="mb-4"><Notice tone="error">{formError}</Notice></div>}
      {form && <VendorForm key={form.id ?? "new"} initialData={form.initial} onSave={f => void save(f)} onCancel={() => setForm(null)} saving={saving} />}
    </AddVendorModal>
  </div></DashboardLayout>;
}

type Detail = {
  id: string; companyName: string; state: string; verified: boolean; verifiedAt: string | null; suspendedAt: string | null; suspensionReason: string | null; createdAt: string;
  contact: { name: string; email: string | null; mobile: string | null; loginActive: boolean };
  profile: { homeCity: string | null; fleetSize: number | null; address: string | null; city: string | null; state: string | null; pinCode: string | null };
  bank: { bankName: string | null; accountNumber: string | null; ifscCode: string | null; branchName: string | null };
  documents: { id: string; documentType: string; documentNumber: string | null; fileUrl: string; status: string; expiryDate: string | null }[];
  vehicles: { id: string; label: string; registrationNumber: string; category: string; status: string; verified: boolean; activePricing: number; driver: { name: string; status: string; mobile: string | null } | null }[];
  marketplace: { listed: boolean; bookableVehicles: number; reason: string | null };
  finance: { grossValue: number; gst: number; earned: number; paid: number; inProcess: number; outstanding: number; completedTrips: number; collected: number; refundsDue: number; walletBalance: number | null };
  settlements: { id: string; netAmount: number; settlementStatus: string; settlementReference: string | null; settledAt: string | null; createdAt: string }[];
  bookings: { id: string; bookingNumber: string; status: string; pickupDateTime: string; total: number; vendorAmount: number; archived: boolean; customer: string; company: string | null }[];
  commitments: { id: string; bookingNumber: string; status: string; pickupDateTime: string }[];
  history: { id: string; action: string; newValue: Record<string, unknown> | null; createdAt: string; user: { name: string } | null }[];
};

function VendorDrawer({ id, onClose, onEdit, onChanged }: { id: string | null; onClose: () => void; onEdit: (id: string) => void; onChanged: (m: string) => void }) {
  const [d, setD] = useState<Detail | null>(null); const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  useEffect(() => { if (!id) return; setD(null); setError(""); send<Detail>(`/api/admin/vendors/${id}`, "GET").then(setD).catch(e => setError(e.message)); }, [id]);
  const act = async (action: string, reason: string) => {
    if (!d) return;
    setBusy(true); setActionError("");
    try {
      const r = await send<{ vendor: Detail; commitments: { bookingNumber: string }[] }>(`/api/admin/vendors/${d.id}`, "POST", { action, reason });
      setD(r.vendor); setConfirm(null);
      const msgs: Record<string, string> = { verify: "Vendor verified. Its eligible fleet is now bookable and shows the Verified Vendor badge.", unverify: "Verification removed. The vendor's fleet is hidden from the marketplace.", suspend: `Vendor suspended: login blocked and fleet removed from the marketplace.${r.commitments.length ? ` ${r.commitments.length} existing booking(s) still need a decision: ${r.commitments.map(c => c.bookingNumber).join(", ")}.` : ""}`, reinstate: "Vendor reinstated.", delete: "Vendor deleted. Login disabled, email/mobile released, financial history preserved." };
      onChanged(msgs[action] ?? "Done.");
    } catch (e) { setActionError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); }
  };
  const ask = (a: string) => { setActionError(""); setConfirm(a); };
  const footer = d && d.state !== "DELETED" ? <>
    <button className="rg-secondary" onClick={() => onEdit(d.id)}>Edit details</button>
    <ResetLoginPassword kind="vendors" id={d.id} />
    {d.state !== "SUSPENDED" && (d.verified ? <button className="rg-secondary" onClick={() => ask("unverify")}>Remove verification</button> : <button className="rg-primary" onClick={() => ask("verify")}>Verify vendor</button>)}
    {d.state === "SUSPENDED" ? <button className="rg-secondary" onClick={() => ask("reinstate")}>Reinstate</button> : <button className="rg-secondary" onClick={() => ask("suspend")}>Suspend</button>}
    <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => ask("delete")}>Delete</button>
  </> : null;
  return <Drawer open={!!id} onClose={onClose} title={d?.companyName ?? "Vendor"} subtitle={d && <span className="flex flex-wrap gap-2"><Pill value={d.state} label={d.state === "PENDING" ? "Awaiting verification" : undefined} />{d.verified && <Pill value="VERIFIED" label={`Verified ${when(d.verifiedAt, false)}`} />}<span>{d.marketplace.listed ? `${d.marketplace.bookableVehicles} vehicle(s) in marketplace` : `Not in marketplace${d.marketplace.reason ? ` — ${d.marketplace.reason}` : ""}`}</span></span>} footer={footer}>
    {error && <Notice tone="error">{error}</Notice>}
    {!d && !error && <p className="text-sm text-neutral-500">Loading…</p>}
    {d && <>
      {d.state === "SUSPENDED" && <Notice tone="error">Suspended {when(d.suspendedAt)} — {d.suspensionReason}. {d.commitments.length ? `${d.commitments.length} existing booking(s) remain and need an operational decision (reassign or cancel in Bookings).` : "No open bookings."}</Notice>}
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Profile"><div className="px-5 py-3"><Rows items={[["Contact", d.contact.name], ["Email", d.contact.email ?? "Released"], ["Mobile", d.contact.mobile ?? "—"], ["Login", d.contact.loginActive ? "Active" : "Blocked"], ["City", d.profile.city ?? d.profile.homeCity ?? "—"], ["Address", [d.profile.address, d.profile.state, d.profile.pinCode].filter(Boolean).join(", ") || "—"], ["Joined", when(d.createdAt, false)]]} /></div></Section>
        <Section title="Earnings & payables" description="Earned = vendor amount on completed trips; paid = completed settlements"><div className="px-5 py-3"><Rows items={[["Gross booking value", inr(d.finance.grossValue)], ["Completed trips", num(d.finance.completedTrips)], ["Vendor earned", inr(d.finance.earned)], ["Paid out", inr(d.finance.paid)], ["Payout in process", inr(d.finance.inProcess)], ["Outstanding payable", <strong key="o">{inr(d.finance.outstanding)}</strong>], ["Wallet balance", d.finance.walletBalance == null ? "No wallet" : inr(d.finance.walletBalance)]]} /></div></Section>
      </div>
      <Section title="Fleet · vehicle → driver">{d.vehicles.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Vehicle</th><th>Status</th><th>Driver</th><th className="text-right">Active pricing</th></tr></thead><tbody>{d.vehicles.map(v => <tr key={v.id}><td>{v.label}<p className="text-xs text-neutral-500">{v.registrationNumber} · {words(v.category)}</p></td><td><Pill value={v.status} />{!v.verified && <p className="text-[11px] text-amber-700">Vehicle not verified</p>}</td><td>{v.driver ? <>{v.driver.name}<p className="text-xs text-neutral-500">{words(v.driver.status)} · {v.driver.mobile ?? "—"}</p></> : <span className="text-xs text-amber-700">No driver assigned</span>}</td><td className="text-right">{v.activePricing}</td></tr>)}</tbody></table></div> : <Empty title="No vehicles" text="Vehicles are added in Vehicles." />}</Section>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Documents">{d.documents.length ? <ul className="divide-y divide-slate-200 text-sm">{d.documents.map(x => <li key={x.id} className="flex items-center justify-between px-5 py-2"><a className="text-red-700 hover:underline" href={x.fileUrl} target="_blank" rel="noreferrer">{words(x.documentType)}</a><Pill value={x.status} /></li>)}</ul> : <Empty title="No documents uploaded" />}</Section>
        <Section title="Bank details"><div className="px-5 py-3"><Rows items={[["Bank", d.bank.bankName ?? "—"], ["Account", d.bank.accountNumber ?? "—"], ["IFSC", d.bank.ifscCode ?? "—"], ["Branch", d.bank.branchName ?? "—"]]} /></div></Section>
      </div>
      <Section title="Settlements">{d.settlements.length ? <ul className="divide-y divide-slate-200 text-sm">{d.settlements.map(s => <li key={s.id} className="flex items-center justify-between px-5 py-2"><span>{when(s.settledAt ?? s.createdAt, false)} · {s.settlementReference ?? "—"}</span><span className="flex items-center gap-2">{inr(s.netAmount)} <Pill value={s.settlementStatus} /></span></li>)}</ul> : <Empty title="No settlements yet" />}</Section>
      <Section title="Bookings" actions={<Link className="text-xs font-semibold text-red-700" href={`/bookings?vendorId=${d.id}`}>All bookings</Link>}>{d.bookings.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Booking</th><th>Customer</th><th>Pickup</th><th>Status</th><th className="text-right">Total · vendor</th></tr></thead><tbody>{d.bookings.map(b => <tr key={b.id}><td><Link className="font-semibold text-red-700" href={`/bookings?q=${b.bookingNumber}${b.archived ? "&archived=1" : ""}`}>{b.bookingNumber}</Link></td><td className="text-xs">{b.company ? `${b.company} · ` : ""}{b.customer}</td><td className="text-xs">{when(b.pickupDateTime)}</td><td><Pill value={b.status} /></td><td className="text-right text-xs">{inr(b.total)} · {inr(b.vendorAmount)}</td></tr>)}</tbody></table></div> : <Empty title="No bookings yet" />}</Section>
      <Section title="Audit">{d.history.length ? <ul className="space-y-1 px-5 py-3 text-xs">{d.history.map(h => <li key={h.id}>{when(h.createdAt)} · {h.user?.name ?? "System"} · {words(String(h.newValue?.event ?? h.action))}{h.newValue?.reason ? ` — ${String(h.newValue.reason)}` : ""}</li>)}</ul> : <Empty title="No admin actions yet" />}</Section>
    </>}
    <Confirm open={confirm === "verify"} title="Verify this vendor?" busy={busy} error={actionError} confirmLabel="Verify" message="Confirm you have checked the vendor's documents. Verified vendors' eligible vehicles become bookable and show a Verified Vendor badge." onCancel={() => setConfirm(null)} onConfirm={r => void act("verify", r)} />
    <Confirm open={confirm === "unverify"} title="Remove verification?" requireReason busy={busy} error={actionError} confirmLabel="Remove" message="The vendor's fleet leaves the marketplace for new bookings. Existing bookings are unaffected." onCancel={() => setConfirm(null)} onConfirm={r => void act("unverify", r)} />
    <Confirm open={confirm === "suspend"} title="Suspend vendor?" danger requireReason busy={busy} error={actionError} confirmLabel="Suspend" message={<>Vendor login is blocked and all its vehicles leave the marketplace immediately. {d?.commitments.length ? `${d.commitments.length} existing booking(s) stay in place for you to reassign or cancel.` : "There are no open bookings."}</>} onCancel={() => setConfirm(null)} onConfirm={r => void act("suspend", r)} />
    <Confirm open={confirm === "reinstate"} title="Reinstate vendor?" busy={busy} error={actionError} confirmLabel="Reinstate" message="Login is restored and verified inventory returns to the marketplace." onCancel={() => setConfirm(null)} onConfirm={r => void act("reinstate", r)} />
    <Confirm open={confirm === "delete"} title="Delete vendor?" danger requireReason busy={busy} error={actionError} confirmLabel="Delete vendor" message="Login is disabled and the email/mobile released for future registration. Trips, payments and settlements are preserved. Vendors with open or upcoming bookings cannot be deleted." onCancel={() => setConfirm(null)} onConfirm={r => void act("delete", r)} />
  </Drawer>;
}
