'use client';

import { MapPin } from 'lucide-react';
import LocationSelector from './LocationSelector';

interface LocationCardProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function LocationCard({
  title,
  value,
  onChange,
  placeholder,
  required = false,
}: LocationCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-blue-100 p-2">
          <MapPin size={18} className="text-blue-600" />
        </div>

        <h3 className="text-base font-semibold text-slate-800">
          {title}
        </h3>
      </div>

      <LocationSelector
        label={title}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}