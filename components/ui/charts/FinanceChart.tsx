"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { month: "Jan", profit: 25 },
  { month: "Feb", profit: 32 },
  { month: "Mar", profit: 48 },
  { month: "Apr", profit: 52 },
  { month: "May", profit: 58 },
  { month: "Jun", profit: 72 },
];

export default function FinanceChart() {
  return (
    <div className="h-72">

      <ResponsiveContainer>

        <LineChart data={data}>

          <CartesianGrid strokeDasharray="3 3"/>

          <XAxis dataKey="month"/>

          <YAxis/>

          <Tooltip/>

          <Line
            type="monotone"
            dataKey="profit"
            stroke="#16A34A"
            strokeWidth={4}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>
  );
}