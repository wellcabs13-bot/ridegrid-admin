interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Running: 'bg-orange-100 text-orange-700',
    Scheduled: 'bg-blue-100 text-blue-700',
    Cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {status}
    </span>
  );
}
