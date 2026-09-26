import type { ReactNode } from "react";

interface WebsiteSeoCardProps {
  children: ReactNode;
  className?: string;
}

export default function WebsiteSeoCard({
  children,
  className = "",
}: WebsiteSeoCardProps) {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}
