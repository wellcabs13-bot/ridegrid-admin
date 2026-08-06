import DashboardLayout from "@/components/DashboardLayout";

import AIOverview from "@/components/ai/AIOverview";
import AIStats from "@/components/ai/AIStats";
import AIInsightCard from "@/components/ai/AIInsightCard";
import AIActivity from "@/components/ai/AIActivity";

export default function AIPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">

        <AIOverview />

        <AIStats />

        <AIInsightCard />

        <AIActivity />

      </div>
    </DashboardLayout>
  );
}