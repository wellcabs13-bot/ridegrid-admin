"use client";
import { useState } from "react";
import { DataState, useAdminData } from "./Primitives";
import RecordTable, { Column, RecordRow } from "./RecordTable";
import CorporateApprovalRequests from "./CorporateApprovalRequests";
const resources: Record<string, {label:string; columns:Column[]}> = {
  branches:{label:"Branches",columns:[{key:"branchName",title:"Branch"},{key:"city",title:"City"},{key:"address",title:"Address"}]},
  departments:{label:"Departments",columns:[{key:"departmentName",title:"Department"},{key:"departmentCode",title:"Code"}]},
  employees:{label:"Employees",columns:[{key:"employeeName",title:"Employee"},{key:"employeeCode",title:"Code"},{key:"officialEmail",title:"Email"},{key:"designation",title:"Designation"},{key:"isActive",title:"Active"}]},
  "cost-centers":{label:"Cost centers",columns:[{key:"name",title:"Cost center"},{key:"code",title:"Code"}]},
  "travel-policies":{label:"Travel policies",columns:[{key:"policyName",title:"Policy"},{key:"isActive",title:"Active"}]},
  "approval-rules":{label:"Approval rules",columns:[{key:"level",title:"Level"},{key:"approverDesignation",title:"Approver"},{key:"maxAmount",title:"Maximum amount"},{key:"isActive",title:"Active"}]},
  contracts:{label:"Contracts",columns:[{key:"contractNumber",title:"Contract"},{key:"startDate",title:"Start"},{key:"endDate",title:"End"}]},
};
const APPROVALS = "approval-requests";
export default function CorporateOperations({corporateId}:{corporateId:string}) {
  const [resource,setResource]=useState("branches");
  const {data,loading,error,reload}=useAdminData<RecordRow[]>(resource===APPROVALS?null:"/api/corporate?id="+encodeURIComponent(corporateId)+"&resource="+resource);
  return <section className="space-y-4"><h3 className="font-semibold">Corporate operations</h3><div className="flex flex-wrap gap-2" role="tablist" aria-label="Corporate resources">{[...Object.entries(resources).map(([key,item])=>[key,item.label]),[APPROVALS,"Approval requests"]].map(([key,text])=><button type="button" key={key} role="tab" aria-selected={resource===key} className={resource===key?"rg-primary":"rg-secondary"} onClick={()=>setResource(key)}>{text}</button>)}</div>{resource===APPROVALS?<CorporateApprovalRequests corporateId={corporateId}/>:<DataState loading={loading} error={error} onRetry={reload}><RecordTable rows={Array.isArray(data)?data:[]} columns={resources[resource].columns}/></DataState>}</section>;
}
