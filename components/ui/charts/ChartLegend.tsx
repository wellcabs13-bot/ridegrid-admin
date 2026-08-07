"use client";

interface ChartLegendProps {
  items: {
    color: string;
    label: string;
  }[];
}

export default function ChartLegend({
  items,
}: ChartLegendProps) {
  return (
    <div className="mt-5 flex flex-wrap gap-5">

      {items.map((item) => (

        <div
          key={item.label}
          className="flex items-center gap-2"
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{
              background: item.color,
            }}
          />

          <span className="text-sm text-slate-600">
            {item.label}
          </span>

        </div>

      ))}

    </div>
  );
}