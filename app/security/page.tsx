import DashboardLayout from "@/components/DashboardLayout";

import SecurityOverview from "@/components/security/SecurityOverview";
import SecurityStats from "@/components/security/SecurityStats";
import SecurityAlerts from "@/components/security/SecurityAlerts";
import RolePermissionMatrix from "@/components/security/RolePermissionMatrix";
import SessionTable from "@/components/security/SessionTable";
import SecurityAuditLog from "@/components/security/SecurityAuditLog";

export default function SecurityPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <SecurityOverview />

        <SecurityStats />

        <SecurityAlerts />

        <RolePermissionMatrix />

        <SessionTable />

        <SecurityAuditLog />

      </div>
    </DashboardLayout>
  );
}