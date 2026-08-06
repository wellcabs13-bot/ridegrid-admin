'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import NavigationItem from './NavigationItem';
import { NavigationGroup as Group } from './navigation-types';

interface Props {
  group: Group;
}

export default function NavigationGroup({
  group,
}: Props) {
  const [open, setOpen] = useState(
    group.defaultOpen ?? true
  );

  return (
    <section className="mb-6">

      {/* Group Header */}

      <button
        onClick={() => setOpen(!open)}
        className="mb-2 flex w-full items-center justify-between px-2"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
          {group.title}
        </span>

        {open ? (
          <ChevronDown
            size={15}
            className="text-slate-500 transition-transform"
          />
        ) : (
          <ChevronRight
            size={15}
            className="text-slate-500 transition-transform"
          />
        )}
      </button>

      {/* Items */}

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          open
            ? "max-h-[1200px] opacity-100"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-1">

          {group.items.map((item) => (
            <NavigationItem
              key={item.title}
              item={item}
            />
          ))}

        </div>
      </div>

    </section>
  );
}