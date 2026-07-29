'use client';

import { useEffect, useState } from 'react';
import FareEngine from './FareEngine';
import { FareInput, FareOutput } from './types';
import FareBreakdown from './FareBreakdown';

interface Props {
  data: FareInput;
  onChange?: (fare: FareOutput) => void;
}

export default function FareCalculator({
  data,
  onChange,
}: Props) {
  const [result, setResult] = useState<FareOutput | null>(null);

  useEffect(() => {
    const fare = FareEngine.calculate(data);

    setResult(fare);

    onChange?.(fare);
  }, [data, onChange]);

  if (!result) return null;

  return (
    <div className="space-y-6">
      <FareBreakdown fare={result} />
    </div>
  );
}