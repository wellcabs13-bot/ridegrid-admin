"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Confirm, Drawer, Empty, Field, Notice, Pager, Pill, Rows, Section, inr, num, send, when, words } from "@/components/admin/kit";
import { RefreshCw } from "lucide-react";

type Stats = { total: number; completed: number; cancelled: number; value: number; lastTrip: string | null; upcoming: number };
type Person = { kind: "RETAIL" | "CORPORATE"; id: string; name: string; email: string; mobile: string | null; company: { id: string; companyName: string } | null; department: string | null; branch: string | null; role: string; status: string; createdAt: string; stats: Stats };
type List = { rows: Person[]; total: number; page: number; totalPages: number; counts: { retail: number; corporate: number } };

export default function CustomersPage() {
  const [type, setType] = useState(""); const [status, setStatus] = useState(""); const [q, setQ] = useState(""); const [applied, setApplied] = useState<{ type: string; status: string; q: string } | null>(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<List | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [open, setOpen] = useState<{ kind: string; id: string } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => { const u = new URLSearchParams(window.location.search); const t = u.get("type") ?? ""; setType(t); setApplied({ type: t, status: "", q: "" }); }, []);
  const query = useMemo(() => applied && new URLSearchParams({ ...(applied.type ? { type: applied.type } : {}), ...(applied.status ? { status: applied.status } : {}), ...(applied.q ? { q: applied.q } : {}), page: String(page) }).toString(), [applied, page]);
  const load = useCallback(async () => {
    if (!query) return;
    setLoading(true); setError("");
    try { setData(await send<List>(`/api/admin/people?${query}`, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load customers."); } finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Customers & travellers" description="Retail customers and corporate employees in one view. Retail and corporate accounts stay separate records; corporate profiles are managed with their company.">
      <button className="rg-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ type, status, q: q.trim() }); }}>
      <Field label="Search"><input className="rg-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Name, email, mobile, employee code" /></Field>
      <Field label="Account type"><select className="rg-input" value={type} onChange={e => setType(e.target.value)}><option value="">Retail + Corporate</option><option value="RETAIL">Retail</option><option value="CORPORATE">Corporate</option></select></Field>
      <Field label="Status"><select className="rg-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Active + suspended</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="DELETED">Deleted</option></select></Field>
      <div className="flex items-end gap-2"><button className="rg-primary" type="submit">Apply</button></div>
      {data && <div className="flex items-end text-xs text-neutral-500">{num(data.counts.retail)} retail · {num(data.counts.corporate)} corporate</div>}
    </form></section>
    {error ? <Notice tone="error">{error}</Notice> : <section className="rg-card">
      {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Loading…</p> : !data?.rows.length ? <Empty title="No accounts found" text="Customers appear after registering or booking; corporate travellers appear when their company adds them." /> :
        <div className="overflow-x-auto"><table className="rg-table min-w-[1200px]"><thead><tr><th>Name</th><th>Type</th><th>Contact</th><th>Company · Dept / Branch</th><th>Status</th><th>Registered</th><th className="text-right">Trips (done / cancelled)</th><th className="text-right">Booking value</th><th>Last trip</th><th className="text-right">Upcoming</th></tr></thead>
          <tbody>{data.rows.map(p => <tr key={`${p.kind}-${p.id}`} className="cursor-pointer" onClick={() => setOpen({ kind: p.kind, id: p.id })}>
            <td><button className="font-semibold text-red-700 hover:underline">{p.name}</button><p className="text-[11px] text-neutral-500">{p.role}</p></td>
            <td><Pill value={p.kind} label={p.kind === "RETAIL" ? "Retail" : "Corporate"} /></td>
            <td><p className="text-sm">{p.email}</p><p className="text-xs text-neutral-500">{p.mobile ?? "—"}</p></td>
            <td>{p.company ? <><p>{p.company.companyName}</p><p className="text-xs text-neutral-500">{[p.department, p.branch].filter(Boolean).join(" · ") || "—"}</p></> : "—"}</td>
            <td><Pill value={p.status} /></td><td className="whitespace-nowrap text-xs">{when(p.createdAt, false)}</td>
            <td className="text-right">{num(p.stats.total)} <span className="text-xs text-neutral-500">({num(p.stats.completed)} / {num(p.stats.cancelled)})</span></td>
            <td className="text-right">{inr(p.stats.value)}</td><td className="whitespace-nowrap text-xs">{when(p.stats.lastTrip, false)}</td><td className="text-right">{num(p.stats.upcoming)}</td>
          </tr>)}</tbody></table></div>}
      {data && data.rows.length > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </section>}
    <PersonDrawer target={open} onClose={() => setOpen(null)} onChanged={m => { setNotice(m); void load(); }} />
  </div></DashboardLayout>;
}

type Detail = {
  kind: "RETAIL" | "CORPORATE"; id: string; name: string; firstName?: string; lastName?: string; email: string | null; mobile: string | null; status: string; createdAt: string; verified?: boolean;
  stats: Stats; bookings: { id: string; bookingNumber: string; status: string; pickupDateTime: string; pickupLocation: string; dropLocation: string; finalFare: number; deletedAt: string | null; vendor: { companyName: string } }[];
  payments?: { collected: number; pendingAmount: number; refunded: number; refundsPending: number; failedCount: number };
  history: { id: string; action: string; newValue: Record<string, unknown> | null; createdAt: string; user: { name: string } | null }[];
  company?: { id: string; companyName: string; status: string }; role?: string; employeeCode?: string | null; designation?: string; grade?: string | null; manager?: string | null; isApprover?: boolean;
  department?: string | null; branch?: string | null; costCenter?: string | null; limits?: { monthly: number | null; yearly: number | null };
  policies?: { policyName: string; maxTripAmount: number | null; approvalRequired: boolean }[]; approvals?: { id: string; status: string; amount: number | null; bookingId: string | null; createdAt: string }[];
};

function PersonDrawer({ target, onClose, onChanged }: { target: { kind: string; id: string } | null; onClose: () => void; onChanged: (m: string) => void }) {
  const [d, setD] = useState<Detail | null>(null); const [error, setError] = useState("");
  const [edit, setEdit] = useState(false); const [form, setForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [confirm, setConfirm] = useState<"suspend" | "reactivate" | "delete" | null>(null); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const url = target ? `/api/admin/people/${target.kind.toLowerCase()}/${target.id}` : "";
  useEffect(() => { if (!target) return; setD(null); setError(""); setEdit(false); send<Detail>(url, "GET").then(setD).catch(e => setError(e.message)); }, [target, url]);

  const act = async (action: string, reason: string) => {
    setBusy(true); setActionError("");
    try { setD(await send<Detail>(url, "POST", { action, reason })); setConfirm(null); onChanged(action === "delete" ? "Account deleted. Login disabled and email/mobile released for re-registration; booking and payment history preserved." : action === "suspend" ? "Account suspended; login disabled." : "Account reactivated."); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Action failed."); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setActionError("");
    try { setD(await send<Detail>(url, "PATCH", form)); setEdit(false); onChanged("Profile updated."); } catch (e) { setActionError(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(false); }
  };

  const live = d && d.status !== "DELETED";
  const footer = d && live ? edit ? <><button className="rg-secondary" onClick={() => setEdit(false)}>Back</button><button className="rg-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save profile"}</button></> : <>
    {d.kind === "RETAIL" && <button className="rg-secondary" onClick={() => { setForm({ firstName: d.firstName ?? "", lastName: d.lastName ?? "", email: d.email ?? "", mobile: d.mobile ?? "" }); setActionError(""); setEdit(true); }}>Edit profile</button>}
    {d.status === "ACTIVE" ? <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm("suspend"); }}>Suspend</button> : <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm("reactivate"); }}>Reactivate</button>}
    <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setActionError(""); setConfirm("delete"); }}>Delete account</button>
  </> : null;

  return <Drawer open={!!target} onClose={onClose} title={d?.name ?? "Account"} subtitle={d && <span className="flex items-center gap-2"><Pill value={d.kind} label={d.kind === "RETAIL" ? "Retail customer" : `Corporate · ${d.company?.companyName}`} /><Pill value={d.status} /></span>} footer={footer}>
    {error && <Notice tone="error">{error}</Notice>}
    {!d && !error && <p className="text-sm text-neutral-500">Loading…</p>}
    {edit && actionError && <Notice tone="error">{actionError}</Notice>}
    {d && edit && <Section title="Edit profile" description="Email and mobile must not belong to another active account."><div className="grid gap-3 p-5 sm:grid-cols-2">
      <Field label="First name"><input className="rg-input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} /></Field>
      <Field label="Last name"><input className="rg-input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} /></Field>
      <Field label="Email"><input className="rg-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Field>
      <Field label="Mobile"><input className="rg-input" value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} /></Field>
    </div></Section>}
    {d && !edit && <>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Profile"><div className="px-5 py-3"><Rows items={[["Email", d.email ?? "Released (deleted)"], ["Mobile", d.mobile ?? "—"], ["Registered", when(d.createdAt, false)], ...(d.kind === "RETAIL" ? [["Verified", d.verified ? "Yes" : "No"] as [string, string]] : [["Role", d.role ?? "—"], ["Employee code", d.employeeCode ?? "—"], ["Designation", d.designation ?? "—"], ["Department", d.department ?? "—"], ["Branch", d.branch ?? "—"], ["Approver", d.isApprover ? "Yes" : "No"]] as [string, string][])]} /></div></Section>
        <Section title="Trips & spend"><div className="px-5 py-3"><Rows items={[["Total trips", num(d.stats.total)], ["Completed", num(d.stats.completed)], ["Cancelled", num(d.stats.cancelled)], ["Upcoming", num(d.stats.upcoming)], ["Booking value", inr(d.stats.value)], ["Last trip", when(d.stats.lastTrip, false)], ...(d.payments ? [["Paid", inr(d.payments.collected)], ["Pending payment", inr(d.payments.pendingAmount)], ["Refunded / due", `${inr(d.payments.refunded)} / ${inr(d.payments.refundsPending)}`]] as [string, string][] : [])]} /></div></Section>
      </div>
      {d.kind === "CORPORATE" && <div className="grid gap-4 md:grid-cols-2">
        <Section title="Policy & limits" actions={d.company && <Link className="text-xs font-semibold text-red-700" href={`/corporate?open=${d.company.id}`}>Open company</Link>}><div className="px-5 py-3"><Rows items={[["Monthly limit", inr(d.limits?.monthly)], ["Yearly limit", inr(d.limits?.yearly)], ...((d.policies ?? []).map(p => [p.policyName, `${p.maxTripAmount ? `max ${inr(p.maxTripAmount)} · ` : ""}${p.approvalRequired ? "approval required" : "no approval"}`] as [string, string]))]} /></div></Section>
        <Section title="Approval requests">{d.approvals?.length ? <ul className="space-y-1 px-5 py-3 text-sm">{d.approvals.map(a => <li key={a.id} className="flex justify-between gap-2"><span>{when(a.createdAt, false)} · {inr(a.amount)}</span><Pill value={a.status} /></li>)}</ul> : <Empty title="No approval requests" />}</Section>
      </div>}
      <Section title="Bookings" actions={<span className="text-xs text-neutral-500">Latest 25</span>}>{d.bookings.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Booking</th><th>Pickup</th><th>Vendor</th><th>Status</th><th className="text-right">Fare</th></tr></thead><tbody>{d.bookings.map(b => <tr key={b.id}><td><Link className="font-semibold text-red-700" href={`/bookings?q=${encodeURIComponent(b.bookingNumber)}${b.deletedAt ? "&archived=1" : ""}`}>{b.bookingNumber}</Link></td><td className="text-xs">{when(b.pickupDateTime)}</td><td className="text-xs">{b.vendor.companyName}</td><td><Pill value={b.status} /></td><td className="text-right">{inr(b.finalFare)}</td></tr>)}</tbody></table></div> : <Empty title="No bookings yet" />}</Section>
      <Section title="Account history">{d.history.length ? <ul className="space-y-1 px-5 py-3 text-xs">{d.history.map(h => <li key={h.id}>{when(h.createdAt)} · {h.user?.name ?? "System"} · {words(String(h.newValue?.event ?? h.action))}{h.newValue?.reason ? ` — ${String(h.newValue.reason)}` : ""}</li>)}</ul> : <Empty title="No admin changes recorded" />}</Section>
    </>}
    <Confirm open={confirm === "suspend"} title="Suspend account?" requireReason busy={busy} error={actionError} confirmLabel="Suspend" message="The person can no longer sign in. Bookings and history are unchanged." onCancel={() => setConfirm(null)} onConfirm={r => void act("suspend", r)} />
    <Confirm open={confirm === "reactivate"} title="Reactivate account?" busy={busy} error={actionError} confirmLabel="Reactivate" message="Sign-in is restored." onCancel={() => setConfirm(null)} onConfirm={r => void act("reactivate", r)} />
    <Confirm open={confirm === "delete"} title="Delete account permanently?" danger requireReason busy={busy} error={actionError} confirmLabel="Delete account"
      message={<>Login is disabled and the email and mobile are released so they can register again. Booking, payment and audit history is kept against an anonymised account. Accounts with open or upcoming bookings cannot be deleted.</>} onCancel={() => setConfirm(null)} onConfirm={r => void act("delete", r)} />
  </Drawer>;
}
