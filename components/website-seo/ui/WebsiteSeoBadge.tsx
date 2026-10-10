import type { ReactNode } from "react";

interface WebsiteSeoBadgeProps {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral" | "active";
}

export default function WebsiteSeoBadge({
  children,
  tone = "neutral",
}: WebsiteSeoBadgeProps) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
    danger: "bg-red-50 text-red-700 ring-red-600/20",
    neutral: "bg-zinc-100 text-zinc-700 ring-zinc-500/20",
    active: "bg-red-600 text-white ring-red-600/30",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
