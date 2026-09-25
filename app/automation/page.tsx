"use client";
import DashboardLayout from "@/components/DashboardLayout";
import { DataState, PageHeading, useAdminData, Badge } from "@/components/admin/Primitives";
import RecordTable, { RecordRow } from "@/components/admin/RecordTable";
export default function AutomationPage() {
  const {data,loading,error,reload}=useAdminData<RecordRow[]>("/api/automation?view=rules");
  const listings=useAdminData<{listings:RecordRow[]}>("/api/marketplace/smart-return?limit=50");
  return <DashboardLayout><div className="space-y-6"><PageHeading title="Automation" description="Rules configured in RideGrid’s existing automation engine."><button disabled={loading} onClick={reload} className="rg-secondary">Refresh</button></PageHeading>
    <DataState loading={loading} error={error} onRetry={reload}><RecordTable rows={Array.isArray(data)?data:[]} columns={[{key:"name",title:"Rule"},{key:"description",title:"Purpose"},{key:"trigger",title:"Trigger"},{key:"action",title:"Action"},{key:"enabled",title:"Configured",render:r=><Badge>{r.enabled?"Enabled":"Disabled"}</Badge>}]}/></DataState>
    <section className="rg-card p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Published Smart Return listings</h2><p className="mt-2 text-sm text-neutral-500">Latest 50 published return opportunities from the existing marketplace service.</p></div><button className="rg-secondary" disabled={listings.loading} onClick={listings.reload}>Refresh listings</button></div><DataState loading={listings.loading} error={listings.error} onRetry={listings.reload}><RecordTable rows={listings.data?.listings??[]} columns={[{key:"pickupLocation",title:"Pickup"},{key:"dropLocation",title:"Drop"},{key:"vehicle.make",title:"Vehicle"},{key:"fare",title:"Fare (INR)"},{key:"status",title:"Status"}]}/></DataState></section>
    <p className="text-xs text-neutral-500">Configured rules do not imply successful execution. Run counts and success rates are omitted because execution history is not available from this API.</p>
  </div></DashboardLayout>;
}
