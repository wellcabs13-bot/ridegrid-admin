interface FareSummaryProps {
  fare: string;
}

export default function FareSummary({ fare }: FareSummaryProps) {
  const amount = Number(fare || 0);

  const gst = amount * 0.05;

  const total = amount + gst;

  return (
    <div className="rounded-2xl border bg-slate-50 p-5">
      <h3 className="text-lg font-bold mb-4">Fare Summary</h3>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span>Trip Fare</span>
          <span>₹{amount.toLocaleString('en-IN')}</span>
        </div>

        <div className="flex justify-between">
          <span>GST (5%)</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>

        <hr />

        <div className="flex justify-between text-lg font-bold text-blue-600">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
