"use client";

interface InfoCardProps {
  title: string;
  children: React.ReactNode;
}

export default function InfoCard({
  title,
  children,
}: InfoCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <h3 className="mb-5 text-lg font-bold text-slate-900">
        {title}
      </h3>

      {children}

    </div>
  );
}