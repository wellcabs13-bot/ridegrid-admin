"use client";
import { use, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import EmployeeForm, { EmployeeInput } from "@/components/corporate-admin/EmployeeForm";
import { API, DataState, Detail, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Employee = {
  id: string; employeeName: string; employeeCode: string; officialEmail: string; mobile: string; designation: string; managerName: string | null; managerEmail: string | null;
  employeeGrade: string | null; isApprover: boolean; monthlyTravelLimit: string | null; yearlyTravelLimit: string | null; defaultPickupAddress: string | null;
  emergencyContactName: string | null; emergencyContactMobile: string | null; isActive: boolean; createdAt: string; updatedAt: string;
  branchId: string | null; departmentId: string | null; costCenterId: string | null;
  branch: { branchName: string } | null; department: { departmentName: string } | null; costCenter: { name: string } | null;
  login: { enabled: boolean; role: string | null } | null; isSelf: boolean;
  usage: { month: string; year: string } | null; bookingCount: number; approvalCount: number;
};

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: e, loading, error, reload } = useAdminData<Employee>(`${API}/employees?id=${encodeURIComponent(id)}`);
  const [editing, setEditing] = useState<EmployeeInput | null>(null);
  const [confirm, setConfirm] = useState<null | { action: "SET_ACTIVE" | "SET_APPROVER"; value: boolean }>(null);
  const { busy, error: saveError, run } = useSubmit();
  const s = (v: string | null) => v ?? "";
  async function apply() {
    if (!confirm || !e) return;
    const r = await run(() => send("employees", { action: confirm.action, id: e.id, ...(confirm.action === "SET_ACTIVE" ? { isActive: confirm.value } : { isApprover: confirm.value }) }));
    if (r) { setConfirm(null); void reload(); }
  }
  const isAdmin = e?.login?.role === "CORPORATE_ADMIN";
  return <>
    <PageHeader back={{ href: "/corporate-admin/employees", label: "Employees" }} title={e?.employeeName ?? "Employee"} description={e ? `${e.employeeCode} · ${e.designation}` : undefined}>
      {e && <>
        <button className="rg-secondary" onClick={() => setConfirm({ action: "SET_APPROVER", value: !e.isApprover })}>{e.isApprover ? "Remove approver" : "Make approver"}</button>
        {!e.isSelf && !isAdmin && <button className="rg-secondary" onClick={() => setConfirm({ action: "SET_ACTIVE", value: !e.isActive })}>{e.isActive ? "Deactivate" : "Activate"}</button>}
        <button className="rg-primary" onClick={() => setEditing({
          id: e.id, employeeName: e.employeeName, employeeCode: e.employeeCode, officialEmail: e.officialEmail, mobile: e.mobile, designation: e.designation, employeeGrade: s(e.employeeGrade),
          managerName: s(e.managerName), managerEmail: s(e.managerEmail), branchId: s(e.branchId), departmentId: s(e.departmentId), costCenterId: s(e.costCenterId),
          monthlyTravelLimit: s(e.monthlyTravelLimit), yearlyTravelLimit: s(e.yearlyTravelLimit), defaultPickupAddress: s(e.defaultPickupAddress),
          emergencyContactName: s(e.emergencyContactName), emergencyContactMobile: s(e.emergencyContactMobile), isApprover: e.isApprover,
        })}><Pencil size={15}/>Edit</button>
      </>}
    </PageHeader>
    <DataState loading={loading} error={error} onRetry={reload}>{e && <>
      <div className="flex flex-wrap gap-2"><Status value={e.isActive ? "ACTIVE" : "INACTIVE"}/>{e.isApprover && <Status value="Approver" tone="blue"/>}{isAdmin && <Status value="Company administrator" tone="blue"/>}<Status value={e.login ? (e.login.enabled ? "App login active" : "App login disabled") : "No app login"} tone={e.login?.enabled ? "green" : "gray"}/></div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Profile">
          <Detail items={[
            ["Official email", e.officialEmail], ["Mobile", e.mobile], ["Grade", e.employeeGrade ?? "—"], ["Branch", e.branch?.branchName ?? "—"],
            ["Department", e.department?.departmentName ?? "—"], ["Cost center", e.costCenter?.name ?? "—"], ["Manager", [e.managerName, e.managerEmail].filter(Boolean).join(" · ") || "—"],
            ["Default pickup", e.defaultPickupAddress ?? "—"], ["Emergency contact", [e.emergencyContactName, e.emergencyContactMobile].filter(Boolean).join(" · ") || "—"],
            ["Added", when(e.createdAt)],
          ]}/>
        </Panel>
        <Panel title="Travel eligibility">
          <Detail items={[
            ["Monthly limit", e.monthlyTravelLimit ? inr(e.monthlyTravelLimit) : "No personal limit"],
            ["Booked this month", e.usage ? inr(e.usage.month) : "—"],
            ["Yearly limit", e.yearlyTravelLimit ? inr(e.yearlyTravelLimit) : "No personal limit"],
            ["Booked this year", e.usage ? inr(e.usage.year) : "—"],
          ]}/>
          <div className="flex flex-wrap gap-4 border-t border-neutral-100 px-5 py-3 text-sm">
            <Link className="font-semibold text-red-700" href={`/corporate-admin/bookings?employeeId=${e.id}`}>{e.bookingCount} booking(s) →</Link>
            <span className="text-neutral-500">{e.approvalCount} approval request(s)</span>
          </div>
        </Panel>
      </div>
    </>}</DataState>
    {editing && <EmployeeForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }}/>}
    <Modal open={!!confirm} title={confirm?.action === "SET_ACTIVE" ? (confirm.value ? "Activate employee?" : "Deactivate employee?") : confirm?.value ? "Make this employee an approver?" : "Remove approver role?"} onClose={() => setConfirm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={apply} disabled={busy}>{busy ? "Saving…" : "Confirm"}</button>
    </>}>
      <p className="text-sm text-neutral-600">{confirm?.action === "SET_ACTIVE" ? (confirm.value ? "The employee can book company rides again." : "The employee will no longer be able to book company rides. Existing bookings are not cancelled.") : "The approver flag marks who your company designates for approvals. Decisions in this portal are made by company administrators."}</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
