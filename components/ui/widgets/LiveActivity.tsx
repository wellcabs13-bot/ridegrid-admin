"use client";

const data = [
  "Driver Rahul started Trip RG10251",
  "Customer booked Airport Transfer",
  "Vendor added new Ertiga",
  "Corporate booking confirmed",
  "Payment received ₹18,500",
];

export default function LiveActivity() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h3 className="mb-6 text-xl font-bold">
        Live Activity
      </h3>

      <div className="space-y-4">

        {data.map((item,index)=>(
          <div
            key={index}
            className="flex gap-3"
          >

            <div className="mt-2 h-2 w-2 rounded-full bg-emerald-500"/>

            <p className="text-sm text-slate-600">
              {item}
            </p>

          </div>
        ))}

      </div>

    </div>
  );
}