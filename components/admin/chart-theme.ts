// One chart palette for the Super Admin light workspace (recharts). Colours carry meaning:
// red = RideGrid primary series, blue = value/secondary, violet = AI/insight, green = positive.
export const chart = {
  red: "#e11d2e",
  blue: "#2563eb",
  violet: "#7c3aed",
  green: "#16a34a",
  amber: "#d97706",
  grid: "#e6e9f0",
  axis: { stroke: "#6b7488", fontSize: 11 },
  tooltip: {
    contentStyle: { background: "#ffffff", border: "1px solid #e6e9f0", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px -12px rgba(16,24,40,.25)" },
    labelStyle: { color: "#0f1423", fontWeight: 600 },
    itemStyle: { color: "#3a4256" },
    cursor: { fill: "rgba(15,20,35,0.04)" },
  },
  legend: { fontSize: 12, color: "#3a4256" },
} as const;
