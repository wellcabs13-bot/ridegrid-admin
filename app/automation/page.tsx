import DashboardLayout from "@/components/DashboardLayout";

import AutomationOverview from "@/components/automation/AutomationOverview";
import AutomationStats from "@/components/automation/AutomationStats";
import AutomationRuleTable from "@/components/automation/AutomationRuleTable";
import AutomationActivity from "@/components/automation/AutomationActivity";

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <AutomationOverview />

        <AutomationStats />

        <AutomationRuleTable />

        <AutomationActivity />

      </div>
    </DashboardLayout>
  );
}