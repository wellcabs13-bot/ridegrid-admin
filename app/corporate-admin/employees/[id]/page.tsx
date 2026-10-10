"use client";
import { use, useState } from "react";
import Link from "next/link";
import { KeyRound, Pencil } from "lucide-react";
import EmployeeForm, { EmployeeInput } from "@/components/corporate-admin/EmployeeForm";
import { API, DataState, Detail, inr, Modal, Notice, PageHeader, Panel, send, Status, useAdminData, useSubmit, when } from "@/components/corporate-admin/ui";

type Employee = {
  id: string; employeeName: string; employeeCode: string; officialEmail: string; mobile: string; designation: string; managerName: string | null; managerEmail: string | null;
  employeeGrade: string | null; isApprover: boolean; canBook: boolean; monthlyTravelLimit: string | null; yearlyTravelLimit: string | null; defaultPickupAddress: string | null;
  emergencyContactName: string | null; emergencyContactMobile: string | null; isActive: boolean; createdAt: string; updatedAt: string;
  branchId: string | null; departmentId: string | null; costCenterId: string | null; reportingManagerId: string | null; approvalManagerId: string | null; travelPolicyId: string | null;
  branch: { branchName: string } | null; department: { departmentName: string } | null; costCenter: { name: string } | null;
  reportingManager: { id: string; employeeName: string } | null; approvalManager: { id: string; employeeName: string } | null;
  effectivePolicy: { id: string; name: string; source: string } | null;
  approval: { mode: "AUTO_APPROVED" | "APPROVAL_REQUIRED"; policyName: string | null; approvers: string } | null;
  login: { enabled: boolean; role: string | null } | null; isSelf: boolean;
  usage: { month: string; year: string } | null; bookingCount: number; approvalCount: number;
};
type Confirm = { action: "SET_ACTIVE" | "SET_APPROVER" | "PROVISION_LOGIN"; value: boolean };
const SOURCE: Record<string, string> = { ASSIGNED: "assigned to this employee", DEPARTMENT: "from the department", BRANCH: "from the branch", COMPANY: "company default" };

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: e, loading, error, reload } = useAdminData<Employee>(`${API}/employees?id=${encodeURIComponent(id)}`);
  const [editing, setEditing] = useState<EmployeeInput | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [credential, setCredential] = useState<{ email: string; temporaryPassword: string; emailed: boolean } | null>(null);
  const { busy, error: saveError, run } = useSubmit();
  const s = (v: string | null) => v ?? "";
  async function apply() {
    if (!confirm || !e) return;
    const body = confirm.action === "SET_ACTIVE" ? { isActive: confirm.value } : confirm.action === "SET_APPROVER" ? { isApprover: confirm.value } : {};
    const r = await run(() => send<{ email?: string; temporaryPassword?: string; activationEmailSent?: boolean }>("employees", { action: confirm.action, id: e.id, ...body }));
    if (r) { if (r.temporaryPassword && r.email) setCredential({ email: r.email, temporaryPassword: r.temporaryPassword, emailed: !!r.activationEmailSent }); setConfirm(null); void reload(); }
  }
  const isAdmin = e?.login?.role === "CORPORATE_ADMIN";
  const title = confirm?.action === "PROVISION_LOGIN" ? "Create Corporate Employee App login?" : confirm?.action === "SET_ACTIVE" ? (confirm.value ? "Activate employee?" : "Deactivate employee?") : confirm?.value ? "Make this employee an approver?" : "Remove approver role?";
  const text = confirm?.action === "PROVISION_LOGIN" ? `A login is created for ${e?.officialEmail} and an activation email is sent so the employee can choose a password. A one-time temporary password is also shown once as a fallback. The employee then signs in to the RideGrid Corporate Employee App.`
    : confirm?.action === "SET_ACTIVE" ? (confirm.value ? "The employee can book company rides again." : "The employee will no longer be able to book company rides. Existing bookings are not cancelled.")
    : "Approvers can be selected in the approval workflow. Company administrators can always decide approval steps in this portal.";
  return <>
    <PageHeader back={{ href: "/corporate-admin/employees", label: "Employees" }} title={e?.employeeName ?? "Employee"} description={e ? `${e.employeeCode} · ${e.designation}` : undefined}>
      {e && <>
        {!e.login && e.isActive && <button className="rg-secondary" onClick={() => setConfirm({ action: "PROVISION_LOGIN", value: true })}><KeyRound size={15}/>Create app login</button>}
        <button className="rg-secondary" onClick={() => setConfirm({ action: "SET_APPROVER", value: !e.isApprover })}>{e.isApprover ? "Remove approver" : "Make approver"}</button>
        {!e.isSelf && !isAdmin && <button className="rg-secondary" onClick={() => setConfirm({ action: "SET_ACTIVE", value: !e.isActive })}>{e.isActive ? "Deactivate" : "Activate"}</button>}
        <button className="rg-primary" onClick={() => setEditing({
          id: e.id, employeeName: e.employeeName, employeeCode: e.employeeCode, officialEmail: e.officialEmail, mobile: e.mobile, designation: e.designation, employeeGrade: s(e.employeeGrade),
          branchId: s(e.branchId), departmentId: s(e.departmentId), costCenterId: s(e.costCenterId), reportingManagerId: s(e.reportingManagerId), approvalManagerId: s(e.approvalManagerId),
          travelPolicyId: s(e.travelPolicyId), monthlyTravelLimit: s(e.monthlyTravelLimit), yearlyTravelLimit: s(e.yearlyTravelLimit), defaultPickupAddress: s(e.defaultPickupAddress),
          emergencyContactName: s(e.emergencyContactName), emergencyContactMobile: s(e.emergencyContactMobile), isApprover: e.isApprover, canBook: e.canBook,
        })}><Pencil size={15}/>Edit</button>
      </>}
    </PageHeader>
    {credential && <Notice tone="success">Login created for {credential.email}. {credential.emailed ? "An activation email was sent so the employee can choose a password. " : "The activation email could not be sent; the employee can use Forgot Password in the app. "}Fallback temporary password: <strong className="font-mono">{credential.temporaryPassword}</strong> — shown once. Share it securely; the employee should change it after signing in.</Notice>}
    <DataState loading={loading} error={error} onRetry={reload}>{e && <>
      <div className="flex flex-wrap gap-2"><Status value={e.isActive ? "ACTIVE" : "INACTIVE"}/>{e.isApprover && <Status value="Approver" tone="blue"/>}{!e.canBook && <Status value="Cannot book" tone="gray"/>}{isAdmin && <Status value="Company administrator" tone="blue"/>}<Status value={e.login ? (e.login.enabled ? "App login active" : "App login disabled") : "No app login"} tone={e.login?.enabled ? "green" : "gray"}/></div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Profile">
          <Detail items={[
            ["Official email", e.officialEmail], ["Mobile", e.mobile], ["Grade", e.employeeGrade ?? "—"], ["Branch", e.branch?.branchName ?? "—"],
            ["Department", e.department?.departmentName ?? "—"], ["Cost center", e.costCenter?.name ?? "—"],
            ["Reporting manager", e.reportingManager ? <Link key="rm" className="text-red-700" href={`/corporate-admin/employees/${e.reportingManager.id}`}>{e.reportingManager.employeeName}</Link> : (e.managerName ?? "—")],
            ["Approval manager", e.approvalManager ? <Link key="am" className="text-red-700" href={`/corporate-admin/employees/${e.approvalManager.id}`}>{e.approvalManager.employeeName}</Link> : "—"],
            ["Default pickup", e.defaultPickupAddress ?? "—"], ["Emergency contact", [e.emergencyContactName, e.emergencyContactMobile].filter(Boolean).join(" · ") || "—"],
            ["Added", when(e.createdAt)],
          ]}/>
        </Panel>
        <Panel title="Travel eligibility">
          <Detail items={[
            ["Travel policy", e.effectivePolicy ? `${e.effectivePolicy.name} (${SOURCE[e.effectivePolicy.source] ?? ""})` : "No policy — trips are allowed within personal limits"],
            ["Booking permission", e.canBook ? "Can book" : "Cannot book"],
            ["Booking approval", e.approval ? (e.approval.mode === "AUTO_APPROVED" ? "Auto-approved by policy" : `Approval required · ${e.approval.approvers}`) : "—"],
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
    <Modal open={!!confirm} title={title} onClose={() => setConfirm(null)} footer={<>
      <button className="rg-secondary" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
      <button className="rg-primary" onClick={apply} disabled={busy}>{busy ? "Saving…" : "Confirm"}</button>
    </>}>
      <p className="text-sm text-neutral-600">{text}</p>
      {saveError && <div className="mt-3"><Notice tone="error">{saveError}</Notice></div>}
    </Modal>
  </>;
}
