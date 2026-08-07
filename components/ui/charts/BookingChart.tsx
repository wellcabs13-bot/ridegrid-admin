"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "Mon", bookings: 42 },
  { day: "Tue", bookings: 58 },
  { day: "Wed", bookings: 67 },
  { day: "Thu", bookings: 71 },
  { day: "Fri", bookings: 88 },
  { day: "Sat", bookings: 105 },
];

export default function BookingChart() {
  return (
    <div className="h-72">

      <ResponsiveContainer>

        <BarChart data={data}>

          <XAxis dataKey="day" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="bookings"
            radius={[8,8,0,0]}
            fill="#2563EB"
          />

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
}