"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageHeading } from "@/components/admin/Primitives";
import { Confirm, Drawer, Empty, Field, Notice, Pager, Pill, Rows, Section, inr, num, send, when, words } from "@/components/admin/kit";
import { Copy, Plus, RefreshCw } from "lucide-react";

type Row = {
  id: string; companyName: string; status: string; city: string | null; email: string; mobile: string; createdAt: string; tier: string | null;
  primaryAdmin: { name: string; email: string; mobile: string } | null; credit: { enabled: boolean; limit: number; outstanding: number; available: number };
  bookingsThisMonth: number; tripsToday: number; completedThisMonth: number; totalBookings: number; spendThisMonth: number; gstThisMonth: number; spendAllTime: number; gstAllTime: number; pendingApprovals: number; employees: number;
};
type List = { rows: Row[]; total: number; page: number; totalPages: number };

export default function CorporatePage() {
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [applied, setApplied] = useState({ q: "", status: "" });
  const [page, setPage] = useState(1); const [data, setData] = useState<List | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null); const [creating, setCreating] = useState(false); const [notice, setNotice] = useState("");
  const [credential, setCredential] = useState<{ title: string; email: string; password: string } | null>(null);

  useEffect(() => { const id = new URLSearchParams(window.location.search).get("open"); if (id) setOpen(id); }, []);
  const query = useMemo(() => new URLSearchParams({ ...(applied.q ? { q: applied.q } : {}), ...(applied.status ? { status: applied.status } : {}), page: String(page) }).toString(), [applied, page]);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await send<List>(`/api/admin/corporates?${query}`, "GET")); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load companies."); } finally { setLoading(false); }
  }, [query]);
  useEffect(() => { void load(); }, [load]);

  return <DashboardLayout><div className="mx-auto max-w-[1600px] space-y-5">
    <PageHeading title="Corporate accounts" description="Companies, their Corporate Credit, travellers, approvals and spend — the same records the Corporate Portal and Employee App use.">
      <button className="rg-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button>
      <button className="rg-primary" onClick={() => setCreating(true)}><Plus size={15} />Add company</button>
    </PageHeading>
    {notice && <Notice tone="success" onClose={() => setNotice("")}>{notice}</Notice>}
    {credential && <CredentialNotice {...credential} onClose={() => setCredential(null)} />}
    <section className="rg-card p-4"><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ q: q.trim(), status }); }}>
      <Field label="Search"><input className="rg-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Company, email, GSTIN, city" /></Field>
      <Field label="Status"><select className="rg-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option></select></Field>
      <div className="flex items-end"><button className="rg-primary" type="submit">Apply</button></div>
    </form></section>
    {error ? <Notice tone="error">{error}</Notice> : <section className="rg-card">
      {loading && !data ? <p className="p-10 text-center text-sm text-neutral-500">Loading…</p> : !data?.rows.length ? <Empty title="No corporate accounts" text="Add a company to create its Corporate Admin login and Corporate Credit account." /> :
        <div className="overflow-x-auto"><table className="rg-table min-w-[1500px]"><thead><tr><th>Company</th><th>Primary admin</th><th>Status</th><th className="text-right">Credit limit · available</th><th className="text-right">Outstanding</th><th className="text-right">Bookings (month · total)</th><th className="text-right">Trips today · done (month)</th><th className="text-right">Spend month (GST)</th><th className="text-right">Spend all-time</th><th className="text-right">Approvals</th><th className="text-right">Travellers</th></tr></thead>
          <tbody>{data.rows.map(c => <tr key={c.id} className="cursor-pointer" onClick={() => setOpen(c.id)}>
            <td><button className="font-semibold text-red-700 hover:underline">{c.companyName}</button><p className="text-xs text-neutral-500">{c.city ?? "—"}{c.tier ? ` · ${words(c.tier)}` : ""}</p></td>
            <td>{c.primaryAdmin ? <><p>{c.primaryAdmin.name}</p><p className="text-xs text-neutral-500">{c.primaryAdmin.email}</p></> : <span className="text-xs text-amber-700">No admin</span>}</td>
            <td><Pill value={c.status} />{!c.credit.enabled && <p className="mt-1 text-[11px] text-amber-700">Credit not active</p>}</td>
            <td className="text-right">{inr(c.credit.limit)} · {inr(c.credit.available)}</td><td className="text-right font-semibold">{inr(c.credit.outstanding)}</td>
            <td className="text-right">{num(c.bookingsThisMonth)} · {num(c.totalBookings)}</td><td className="text-right">{num(c.tripsToday)} · {num(c.completedThisMonth)}</td>
            <td className="text-right">{inr(c.spendThisMonth)} <span className="text-xs text-neutral-500">({inr(c.gstThisMonth)})</span></td><td className="text-right">{inr(c.spendAllTime)}</td>
            <td className="text-right">{c.pendingApprovals ? <span className="font-semibold text-amber-700">{c.pendingApprovals}</span> : 0}</td><td className="text-right">{num(c.employees)}</td>
          </tr>)}</tbody></table></div>}
      {data && data.rows.length > 0 && <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />}
    </section>}
    <CreateCorporate open={creating} onClose={() => setCreating(false)} onCreated={(r, name) => { setCreating(false); setCredential({ title: `${name} created. Share the Corporate Admin's temporary password securely — it is shown only once.`, email: r.adminEmail, password: r.temporaryPassword }); void load(); setOpen(r.corporateId); }} />
    <CorporateDrawer id={open} onClose={() => setOpen(null)} onChanged={m => { setNotice(m); void load(); }} onCredential={setCredential} />
  </div></DashboardLayout>;
}

function CredentialNotice({ title, email, password, onClose }: { title: string; email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
    <p className="font-semibold">{title}</p>
    <div className="mt-2 flex flex-wrap items-center gap-3"><span>Login: <strong>{email}</strong></span><span>Temporary password: <code className="rounded bg-white px-2 py-0.5 font-mono">{password}</code></span>
      <button className="rg-secondary" onClick={() => { void navigator.clipboard?.writeText(`${email} / ${password}`); setCopied(true); }}><Copy size={14} />{copied ? "Copied" : "Copy"}</button>
      <button className="text-xs underline" onClick={onClose}>I have shared it — hide</button></div>
    <p className="mt-2 text-xs">Ask the user to change it after first sign-in using “Forgot password”. RideGrid stores only a hash.</p>
  </div>;
}

const EMPTY_FORM = { companyName: "", legalName: "", gstNumber: "", email: "", mobile: "", address: "", city: "", state: "", pincode: "", billingCycle: "MONTHLY", creditLimit: "", paymentTermsDays: "30", requireApproval: false, adminName: "", adminEmail: "", adminMobile: "", adminDesignation: "" };

function CreateCorporate({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (r: { corporateId: string; adminEmail: string; temporaryPassword: string }, name: string) => void }) {
  const [f, setF] = useState(EMPTY_FORM); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (open) { setF(EMPTY_FORM); setError(""); } }, [open]);
  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) => setF(x => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const r = await send<{ corporateId: string; adminEmail: string; temporaryPassword: string }>("/api/admin/corporates", "POST", { ...f, admin: { name: f.adminName, email: f.adminEmail, mobile: f.adminMobile, designation: f.adminDesignation } });
      onCreated(r, f.companyName);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create company."); } finally { setBusy(false); }
  };
  const input = (k: keyof typeof EMPTY_FORM, label: string, props: Record<string, string> = {}) => <Field label={label}><input className="rg-input" value={String(f[k])} onChange={e => set(k, e.target.value)} {...props} /></Field>;
  return <Drawer open={open} onClose={onClose} title="Add corporate account" subtitle="Creates the company, its primary Corporate Admin login and its Corporate Credit account." footer={<><button className="rg-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="rg-primary" disabled={busy} onClick={() => void submit()}>{busy ? "Creating…" : "Create company"}</button></>}>
    {error && <Notice tone="error">{error}</Notice>}
    <Section title="Company"><div className="grid gap-3 p-5 sm:grid-cols-2">
      {input("companyName", "Company name *")}{input("legalName", "Legal name")}{input("gstNumber", "GSTIN", { placeholder: "15 characters" })}{input("email", "Company email *", { type: "email" })}{input("mobile", "Company phone *")}
      <div className="sm:col-span-2">{input("address", "Registered address *")}</div>{input("city", "City *")}{input("state", "State *")}{input("pincode", "PIN code *")}
    </div></Section>
    <Section title="Primary Corporate Admin" description="This person signs in to the Corporate Portal and manages employees, policies and approvals."><div className="grid gap-3 p-5 sm:grid-cols-2">
      {input("adminName", "Full name *")}{input("adminDesignation", "Designation", { placeholder: "e.g. Travel Manager" })}{input("adminEmail", "Work email (login) *", { type: "email" })}{input("adminMobile", "Mobile *")}
    </div></Section>
    <Section title="Corporate Credit & billing"><div className="grid gap-3 p-5 sm:grid-cols-3">
      {input("creditLimit", "Credit limit (₹)", { inputMode: "numeric", placeholder: "0 = not yet enabled" })}
      <Field label="Billing cycle"><select className="rg-input" value={f.billingCycle} onChange={e => set("billingCycle", e.target.value)}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="FORTNIGHTLY">Fortnightly</option><option value="PER_TRIP">Per trip</option></select></Field>
      {input("paymentTermsDays", "Payment terms (days)", { inputMode: "numeric" })}
      <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" checked={f.requireApproval} onChange={e => set("requireApproval", e.target.checked)} />Require approval for every trip (creates a default travel policy the company can change)</label>
    </div></Section>
  </Drawer>;
}

type Detail = {
  id: string; companyName: string; legalName: string | null; gstNumber: string | null; panNumber: string | null; email: string; mobile: string; address: string; city: string | null; state: string; pincode: string;
  status: string; billingCycle: string; approvalFlow: string; creditLimit: number | null; paymentTermsDays: number | null; accountManagerName: string | null; createdAt: string;
  billingAddress: string | null; billingCity: string | null; billingState: string | null; billingPincode: string | null;
  contactPersonName: string | null; contactPersonDesignation: string | null; contactPersonEmail: string | null; contactPersonMobile: string | null;
  wallet: { balance: number; creditLimit: number | null; transactions: { id: string; transactionType: string; amount: number; balanceAfter: number | null; description: string | null; createdAt: string }[] } | null;
  commercialProfile: { customerTier: string; expectedMonthlyBookings: number | null; agreementFileName: string | null } | null;
  branches: { id: string; branchName: string; city: string | null; isHeadOffice: boolean }[]; corporateDepartments: { id: string; departmentName: string }[];
  travelPolicies: { id: string; policyName: string; maxTripAmount: number | null; approvalRequired: boolean; isActive: boolean; outstationAllowed: boolean; nightTravelAllowed: boolean }[];
  employees: { id: string; name: string; code: string; email: string; mobile: string; designation: string; department: string | null; branch: string | null; isApprover: boolean; active: boolean; role: string | null; hasLogin: boolean; loginActive: boolean }[];
  credit: { enabled: boolean; limit: number; outstanding: number; available: number };
  finance: { month: { bookings: number; bookingValue: number; gst: number }; allTime: { bookings: number; bookingValue: number; gst: number; taxableValue: number }; payments: { collectedCorporateCredit: number; refunded: number } };
  counts: { budgets: number; contracts: number };
  approvals: { id: string; status: string; amount: number | null; bookingId: string | null; currentStage: string; createdAt: string; employee: string }[];
  bookings: { id: string; bookingNumber: string; status: string; pickupDateTime: string; total: number; gst: number; archived: boolean; traveller: string; vendor: string }[];
  history: { id: string; action: string; entityName: string; newValue: Record<string, unknown> | null; createdAt: string; user: { name: string } | null }[];
};

function CorporateDrawer({ id, onClose, onChanged, onCredential }: { id: string | null; onClose: () => void; onChanged: (m: string) => void; onCredential: (c: { title: string; email: string; password: string }) => void }) {
  const [d, setD] = useState<Detail | null>(null); const [error, setError] = useState(""); const [tab, setTab] = useState("overview");
  const [edit, setEdit] = useState<{ creditLimit: string; billingCycle: string; paymentTermsDays: string } | null>(null);
  const [confirm, setConfirm] = useState<{ status: string } | { employeeId: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  useEffect(() => { if (!id) return; setD(null); setError(""); setTab("overview"); setEdit(null); send<Detail>(`/api/admin/corporates/${id}`, "GET").then(setD).catch(e => setError(e.message)); }, [id]);

  const patch = async (body: Record<string, unknown>, message: string) => {
    if (!d) return;
    setBusy(true); setActionError("");
    try { setD(await send<Detail>(`/api/admin/corporates/${d.id}`, "PATCH", body)); setEdit(null); setConfirm(null); onChanged(message); } catch (e) { setActionError(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(false); }
  };
  const provision = async (employeeId: string) => {
    if (!d) return;
    setBusy(true); setActionError("");
    try {
      const r = await send<{ email: string; temporaryPassword: string }>(`/api/admin/corporates/${d.id}`, "POST", { action: "provision-login", employeeId });
      setConfirm(null); onCredential({ title: "Employee App login created. Share the temporary password securely — it is shown only once.", email: r.email, password: r.temporaryPassword });
      setD(await send<Detail>(`/api/admin/corporates/${d.id}`, "GET"));
    } catch (e) { setActionError(e instanceof Error ? e.message : "Unable to create login."); } finally { setBusy(false); }
  };

  const tabs = ["overview", "travellers", "approvals", "bookings", "credit", "setup", "activity"];
  const footer = d ? edit ? <><button className="rg-secondary" onClick={() => setEdit(null)}>Back</button><button className="rg-primary" disabled={busy} onClick={() => void patch({ creditLimit: edit.creditLimit, billingCycle: edit.billingCycle, paymentTermsDays: edit.paymentTermsDays }, "Commercial terms updated.")}>{busy ? "Saving…" : "Save"}</button></> : <>
    <button className="rg-secondary" onClick={() => { setActionError(""); setEdit({ creditLimit: String(d.credit.limit), billingCycle: d.billingCycle, paymentTermsDays: String(d.paymentTermsDays ?? 30) }); }}>Edit credit & billing</button>
    {d.status === "ACTIVE" ? <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm({ status: "SUSPENDED" }); }}>Suspend company</button> : <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm({ status: "ACTIVE" }); }}>Reactivate company</button>}
  </> : null;

  return <Drawer open={!!id} onClose={onClose} title={d?.companyName ?? "Company"} subtitle={d && <span className="flex flex-wrap items-center gap-2"><Pill value={d.status} /><span>Credit {inr(d.credit.available)} available of {inr(d.credit.limit)}</span></span>} footer={footer}>
    {error && <Notice tone="error">{error}</Notice>}
    {!d && !error && <p className="text-sm text-neutral-500">Loading…</p>}
    {actionError && !confirm && <Notice tone="error">{actionError}</Notice>}
    {d && edit && <Section title="Credit & billing" description="The credit limit cannot go below the current outstanding."><div className="grid gap-3 p-5 sm:grid-cols-3">
      <Field label="Credit limit (₹)"><input className="rg-input" inputMode="numeric" value={edit.creditLimit} onChange={e => setEdit({ ...edit, creditLimit: e.target.value })} /></Field>
      <Field label="Billing cycle"><select className="rg-input" value={edit.billingCycle} onChange={e => setEdit({ ...edit, billingCycle: e.target.value })}><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option><option value="FORTNIGHTLY">Fortnightly</option><option value="PER_TRIP">Per trip</option></select></Field>
      <Field label="Payment terms (days)"><input className="rg-input" inputMode="numeric" value={edit.paymentTermsDays} onChange={e => setEdit({ ...edit, paymentTermsDays: e.target.value })} /></Field>
    </div></Section>}
    {d && !edit && <>
      <div className="flex flex-wrap gap-2" role="tablist">{tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "rg-primary" : "rg-secondary"} onClick={() => setTab(t)}>{words(t)}</button>)}</div>
      {tab === "overview" && <div className="grid gap-4 md:grid-cols-2">
        <Section title="Company"><div className="px-5 py-3"><Rows items={[["Legal name", d.legalName ?? "—"], ["GSTIN", d.gstNumber ?? "—"], ["Email", d.email], ["Phone", d.mobile], ["Address", `${d.address}, ${d.city ?? ""} ${d.state} ${d.pincode}`], ["Billing address", d.billingAddress ? `${d.billingAddress}, ${d.billingCity ?? ""} ${d.billingState ?? ""} ${d.billingPincode ?? ""}` : "Same as registered"], ["Primary contact", d.contactPersonName ? [d.contactPersonName, d.contactPersonDesignation, d.contactPersonEmail, d.contactPersonMobile].filter(Boolean).join(" · ") : "—"], ["Tier", d.commercialProfile ? words(d.commercialProfile.customerTier) : "—"], ["Since", when(d.createdAt, false)]]} /></div></Section>
        <Section title="Spend" description="Confirmed-or-later bookings, incl. GST"><div className="px-5 py-3"><Rows items={[["Bookings this month", num(d.finance.month.bookings)], ["Spend this month", inr(d.finance.month.bookingValue)], ["GST this month", inr(d.finance.month.gst)], ["Bookings all-time", num(d.finance.allTime.bookings)], ["Spend all-time", inr(d.finance.allTime.bookingValue)], ["GST all-time", inr(d.finance.allTime.gst)], ["Taxable value all-time", inr(d.finance.allTime.taxableValue)]]} /></div></Section>
        <Section title="Corporate Credit"><div className="px-5 py-3"><Rows items={[["Status", d.credit.enabled ? "Active" : d.credit.limit > 0 ? "Company not active" : "No credit limit set"], ["Limit", inr(d.credit.limit)], ["Outstanding (receivable)", inr(d.credit.outstanding)], ["Available", inr(d.credit.available)], ["Billing", `${words(d.billingCycle)} · ${d.paymentTermsDays ?? 30} days`]]} /></div></Section>
        <Section title="Primary admin & setup"><div className="px-5 py-3"><Rows items={[["Admins", d.employees.filter(e => e.role === "CORPORATE_ADMIN").map(e => e.name).join(", ") || "None"], ["Travellers", num(d.employees.length)], ["Branches / departments", `${d.branches.length} / ${d.corporateDepartments.length}`], ["Active policies", num(d.travelPolicies.filter(p => p.isActive).length)], ["Budgets / contracts", `${d.counts.budgets} / ${d.counts.contracts}`]]} /></div></Section>
      </div>}
      {tab === "travellers" && <Section title="Travellers" description="Employees are added by the company in the Corporate Portal. RideGrid creates their app login.">{d.employees.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Name</th><th>Contact</th><th>Dept · branch</th><th>Access</th><th>Login</th></tr></thead><tbody>{d.employees.map(e => <tr key={e.id}><td>{e.name}<p className="text-xs text-neutral-500">{e.code} · {e.role === "CORPORATE_ADMIN" ? "Corporate Admin" : e.designation}{e.isApprover ? " · approver" : ""}</p></td><td className="text-xs">{e.email}<br />{e.mobile}</td><td className="text-xs">{e.department ?? "—"} · {e.branch ?? "—"}</td><td><Pill value={e.active ? "ACTIVE" : "SUSPENDED"} /></td><td>{e.hasLogin ? <Pill value={e.loginActive ? "ACTIVE" : "INACTIVE"} label={e.loginActive ? "Has login" : "Login disabled"} /> : e.active && d.status === "ACTIVE" ? <button className="rg-secondary" onClick={() => { setActionError(""); setConfirm({ employeeId: e.id, name: e.name }); }}>Create app login</button> : <span className="text-xs text-neutral-500">No login</span>}</td></tr>)}</tbody></table></div> : <Empty title="No travellers yet" text="The Corporate Admin adds employees in the Corporate Portal." />}</Section>}
      {tab === "approvals" && <Section title="Approval requests" description="Decided by the company's approvers. An approval is not a booking until the traveller confirms it.">{d.approvals.length ? <ul className="divide-y divide-slate-200 text-sm">{d.approvals.map(a => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2"><span>{when(a.createdAt)} · {a.employee} · {inr(a.amount)}</span><span className="flex items-center gap-2"><Pill value={a.status} />{a.bookingId && <span className="text-xs text-neutral-500">booked</span>}</span></li>)}</ul> : <Empty title="No approval requests" />}</Section>}
      {tab === "bookings" && <Section title="Bookings" actions={<Link className="text-xs font-semibold text-red-700" href={`/bookings?corporateId=${d.id}`}>All company bookings</Link>}>{d.bookings.length ? <div className="overflow-x-auto"><table className="rg-table"><thead><tr><th>Booking</th><th>Traveller</th><th>Vendor</th><th>Pickup</th><th>Status</th><th className="text-right">Total (GST)</th></tr></thead><tbody>{d.bookings.map(b => <tr key={b.id}><td><Link className="font-semibold text-red-700" href={`/bookings?q=${b.bookingNumber}${b.archived ? "&archived=1" : ""}`}>{b.bookingNumber}</Link></td><td className="text-xs">{b.traveller}</td><td className="text-xs">{b.vendor}</td><td className="text-xs">{when(b.pickupDateTime)}</td><td><Pill value={b.status} /></td><td className="text-right">{inr(b.total)} <span className="text-xs text-neutral-500">({inr(b.gst)})</span></td></tr>)}</tbody></table></div> : <Empty title="No bookings yet" />}</Section>}
      {tab === "credit" && <Section title="Corporate Credit ledger" description="Every debit (booking) and credit (cancellation restore) on the company's credit account">{d.wallet?.transactions.length ? <ul className="divide-y divide-slate-200 text-sm">{d.wallet.transactions.map(t => <li key={t.id} className="flex flex-wrap justify-between gap-2 px-5 py-2"><span>{when(t.createdAt)} · {t.description ?? words(t.transactionType)}</span><span>{t.transactionType === "DEBIT" ? "−" : "+"}{inr(t.amount)} <span className="text-xs text-neutral-500">→ outstanding {inr(t.balanceAfter)}</span></span></li>)}</ul> : <Empty title="No credit movements yet" />}</Section>}
      {tab === "setup" && <div className="grid gap-4 md:grid-cols-2">
        <Section title="Travel policies">{d.travelPolicies.length ? <ul className="space-y-1 px-5 py-3 text-sm">{d.travelPolicies.map(p => <li key={p.id} className="flex justify-between gap-2"><span>{p.policyName}{p.maxTripAmount ? ` · max ${inr(p.maxTripAmount)}` : ""}{p.approvalRequired ? " · approval required" : ""}</span><Pill value={p.isActive ? "ACTIVE" : "INACTIVE"} /></li>)}</ul> : <Empty title="No policy" text="Without a policy, trips within employee limits are allowed without approval." />}</Section>
        <Section title="Branches & departments"><div className="px-5 py-3 text-sm"><p className="text-xs text-neutral-500">Branches</p><p>{d.branches.map(b => `${b.branchName}${b.isHeadOffice ? " (HQ)" : ""}`).join(", ") || "—"}</p><p className="mt-2 text-xs text-neutral-500">Departments</p><p>{d.corporateDepartments.map(x => x.departmentName).join(", ") || "—"}</p></div></Section>
      </div>}
      {tab === "activity" && <Section title="Activity">{d.history.length ? <ul className="space-y-1 px-5 py-3 text-xs">{d.history.map(h => <li key={h.id}>{when(h.createdAt)} · {h.user?.name ?? "System"} · {words(String(h.newValue?.event ?? `${h.action} ${h.entityName}`))}{h.newValue?.reason ? ` — ${String(h.newValue.reason)}` : ""}</li>)}</ul> : <Empty title="No activity recorded" />}</Section>}
    </>}
    <Confirm open={!!confirm && "status" in confirm} title={confirm && "status" in confirm && confirm.status === "ACTIVE" ? "Reactivate company?" : "Suspend company?"} danger={!!confirm && "status" in confirm && confirm.status !== "ACTIVE"} requireReason={!!confirm && "status" in confirm && confirm.status !== "ACTIVE"} busy={busy} error={actionError}
      message={confirm && "status" in confirm && confirm.status !== "ACTIVE" ? "Corporate Credit stops and travellers can no longer book. The Corporate Portal becomes read-only. Existing bookings are unaffected." : "Booking and Corporate Credit resume."}
      confirmLabel={confirm && "status" in confirm && confirm.status === "ACTIVE" ? "Reactivate" : "Suspend"} onCancel={() => setConfirm(null)} onConfirm={r => confirm && "status" in confirm && void patch({ status: confirm.status, reason: r }, confirm.status === "ACTIVE" ? "Company reactivated." : "Company suspended.")} />
    <Confirm open={!!confirm && "employeeId" in confirm} title="Create Employee App login?" busy={busy} error={actionError} confirmLabel="Create login"
      message={<>A login is created for {confirm && "employeeId" in confirm ? confirm.name : ""} using their official email, with a temporary password shown once.</>} onCancel={() => setConfirm(null)} onConfirm={() => confirm && "employeeId" in confirm && void provision(confirm.employeeId)} />
  </Drawer>;
}
