"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", value: 120000 },
  { month: "Feb", value: 168000 },
  { month: "Mar", value: 185000 },
  { month: "Apr", value: 220000 },
  { month: "May", value: 265000 },
  { month: "Jun", value: 310000 },
];

export default function RevenueChart() {
  return (
    <div className="h-80">

      <ResponsiveContainer>

        <AreaChart data={data}>

          <defs>

            <linearGradient
              id="revenue"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#2563EB"
                stopOpacity={0.45}
              />

              <stop
                offset="100%"
                stopColor="#2563EB"
                stopOpacity={0}
              />

            </linearGradient>

          </defs>

          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="month" />

          <YAxis />

          <Tooltip />

          <Area
            dataKey="value"
            stroke="#2563EB"
            fill="url(#revenue)"
            strokeWidth={3}
          />

        </AreaChart>

      </ResponsiveContainer>

    </div>
  );
}