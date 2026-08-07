"use client";

const notifications=[
"7 Pending Vendor Approvals",
"3 Customer Complaints",
"2 Payments Failed",
];

export default function NotificationWidget(){

return(

<div className="rounded-3xl border bg-white p-6 shadow-sm">

<h3 className="mb-6 text-xl font-bold">
Notifications
</h3>

<div className="space-y-4">

{notifications.map((n)=>(
<div
key={n}
className="rounded-xl bg-slate-50 p-4 text-sm"
>
{n}
</div>
))}

</div>

</div>

);

}