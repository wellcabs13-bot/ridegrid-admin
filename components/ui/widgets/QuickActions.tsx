"use client";

import {
Plus,
Car,
Users,
Wallet,
} from "lucide-react";

const actions=[
{
title:"New Booking",
icon:Plus,
},
{
title:"Add Vehicle",
icon:Car,
},
{
title:"Add Driver",
icon:Users,
},
{
title:"Finance",
icon:Wallet,
},
];

export default function QuickActions(){

return(

<div className="rounded-3xl border bg-white p-6 shadow-sm">

<h3 className="mb-6 text-xl font-bold">
Quick Actions
</h3>

<div className="grid grid-cols-2 gap-4">

{actions.map((item)=>(
<button
key={item.title}
className="rounded-2xl border p-5 transition hover:-translate-y-1 hover:border-blue-500"
>

<item.icon
size={24}
className="mx-auto mb-3 text-blue-600"
/>

<p className="text-sm font-medium">
{item.title}
</p>

</button>
))}

</div>

</div>

);

}