"use client";

const bookings=[
["RG100241","Completed"],
["RG100242","Running"],
["RG100243","Pending"],
["RG100244","Cancelled"],
];

export default function RecentBookings(){

return(

<div className="rounded-3xl border bg-white p-6 shadow-sm">

<h3 className="mb-6 text-xl font-bold">
Recent Bookings
</h3>

<div className="space-y-4">

{bookings.map(([id,status])=>(
<div
key={id}
className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
>

<div>

<p className="font-semibold">
{id}
</p>

<p className="text-xs text-slate-500">
Airport Transfer
</p>

</div>

<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
{status}
</span>

</div>
))}

</div>

</div>

);

}