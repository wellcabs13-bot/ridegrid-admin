interface PaymentBadgeProps {
  payment: string;
}

export default function PaymentBadge({ payment }: PaymentBadgeProps) {
  const styles: Record<string, string> = {
    Paid: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Failed: 'bg-red-100 text-red-700',
    Refunded: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${
        styles[payment] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {payment}
    </span>
  );
}
