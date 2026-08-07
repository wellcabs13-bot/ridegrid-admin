"use client";

const stats = [
  {
    label: "Available",
    value: 286,
    color: "bg-emerald-500",
  },
  {
    label: "Running",
    value: 118,
    color: "bg-blue-500",
  },
  {
    label: "Maintenance",
    value: 22,
    color: "bg-orange-500",
  },
];

export default function FleetHealth() {
  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">

      <h3 className="mb-6 text-xl font-bold">
        Fleet Health
      </h3>

      <div className="space-y-5">

        {stats.map((item)=>(
          <div key={item.label}>

            <div className="mb-2 flex justify-between">

              <span>{item.label}</span>

              <strong>{item.value}</strong>

            </div>

            <div className="h-2 rounded-full bg-slate-200">

              <div
                className={`${item.color} h-2 rounded-full`}
                style={{
                  width:`${item.value/3}%`
                }}
              />

            </div>

          </div>
        ))}

      </div>

    </div>
  );
}