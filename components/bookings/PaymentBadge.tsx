import {
  BadgeCheck,
  Clock3,
  CircleX,
  RotateCcw,
  Wallet,
} from 'lucide-react';

interface PaymentBadgeProps {
  payment: string;
}

export default function PaymentBadge({ payment }: PaymentBadgeProps) {
  const paymentConfig: Record<
    string,
    {
      className: string;
      icon: React.ElementType;
    }
  > = {
    Paid: {
      className:
        'bg-emerald-50 text-emerald-700 border border-emerald-200',
      icon: BadgeCheck,
    },

    Pending: {
      className:
        'bg-amber-50 text-amber-700 border border-amber-200',
      icon: Clock3,
    },

    Failed: {
      className:
        'bg-red-50 text-red-700 border border-red-200',
      icon: CircleX,
    },

    Refunded: {
      className:
        'bg-violet-50 text-violet-700 border border-violet-200',
      icon: RotateCcw,
    },
  };

  const config = paymentConfig[payment] || {
    className:
      'bg-slate-100 text-slate-700 border border-slate-200',
    icon: Wallet,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${config.className}`}
    >
      <Icon size={14} />
      {payment}
    </span>
  );
}