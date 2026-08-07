"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Available", value: 286 },
  { name: "Running", value: 118 },
  { name: "Maintenance", value: 22 },
];

const colors = [
  "#16A34A",
  "#2563EB",
  "#F59E0B",
];

export default function FleetChart() {
  return (
    <div className="h-72">

      <ResponsiveContainer>

        <PieChart>

          <Pie
            data={data}
            innerRadius={70}
            outerRadius={95}
            dataKey="value"
          >

            {data.map((_, index) => (
              <Cell
                key={index}
                fill={colors[index]}
              />
            ))}

          </Pie>

          <Tooltip />

        </PieChart>

      </ResponsiveContainer>

    </div>
  );
}