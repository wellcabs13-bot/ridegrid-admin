import {
  CheckCircle2,
  Clock3,
  CarFront,
  XCircle,
  AlertCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<
    string,
    {
      className: string;
      icon: React.ElementType;
    }
  > = {
    Completed: {
      className:
        'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon: CheckCircle2,
    },
    Running: {
      className:
        'bg-orange-50 text-orange-700 border border-orange-200',
      icon: CarFront,
    },
    Scheduled: {
      className:
        'bg-blue-50 text-blue-700 border border-blue-200',
      icon: Clock3,
    },
    Cancelled: {
      className:
        'bg-red-50 text-red-700 border border-red-200',
      icon: XCircle,
    },
  };

  const config = statusConfig[status] || {
    className:
      'bg-slate-100 text-slate-700 border border-slate-200',
    icon: AlertCircle,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${config.className}`}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}