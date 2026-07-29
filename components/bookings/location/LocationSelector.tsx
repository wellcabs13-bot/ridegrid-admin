'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  MapPin,
  Plane,
  Train,
  Landmark,
  Clock3,
  Star,
} from 'lucide-react';

import { LOCATION_MASTER } from './locationMaster';

interface LocationSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function LocationSelector({
  label,
  value,
  onChange,
  placeholder = 'Search Location...',
  required = false,
}: LocationSelectorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);

  const [recent, setRecent] = useState<string[]>([
    'Pune',
    'Mumbai Airport',
    'Shirdi',
  ]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', close);

    return () =>
      document.removeEventListener('mousedown', close);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return LOCATION_MASTER;

    return LOCATION_MASTER.filter((item) =>
      item.name
        .toLowerCase()
        .includes(value.toLowerCase())
    );
  }, [value]);

  function choose(location: string) {
    onChange(location);

    setRecent((prev) => [
      location,
      ...prev.filter((x) => x !== location),
    ]);

    setOpen(false);
  }

  function icon(type: string) {
    switch (type) {
      case 'airport':
        return (
          <Plane
            size={16}
            className="text-sky-600"
          />
        );

      case 'railway':
        return (
          <Train
            size={16}
            className="text-orange-600"
          />
        );

      case 'tourist':
        return (
          <Landmark
            size={16}
            className="text-purple-600"
          />
        );

      default:
        return (
          <MapPin
            size={16}
            className="text-green-600"
          />
        );
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <label className="mb-2 block text-sm font-semibold">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

          {!value && (
            <>
              <div className="border-b p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Clock3 size={16} />
                  Recent
                </div>

                <div className="flex flex-wrap gap-2">
                  {recent.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => choose(item)}
                      className="rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-blue-100"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-b p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold">
                  <Star size={16} />
                  Popular
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {LOCATION_MASTER.filter((x) => x.popular).map(
                    (item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          choose(item.name)
                        }
                        className="rounded-lg border p-2 text-left hover:bg-blue-50"
                      >
                        <div className="font-medium">
                          {item.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          {item.state}
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            </>
          )}

          <div className="max-h-80 overflow-y-auto">

            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  choose(item.name)
                }
                className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"
              >
                {icon(item.type)}

                <div>
                  <div className="font-medium">
                    {item.name}
                  </div>

                  <div className="text-xs capitalize text-slate-500">
                    {item.type} • {item.state}
                  </div>
                </div>
              </button>
            ))}

          </div>
        </div>
      )}
    </div>
  );
}