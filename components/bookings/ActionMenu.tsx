'use client';

import { Pencil, Trash2 } from 'lucide-react';

interface ActionMenuProps {
  bookingId: string;
}

export default function ActionMenu({ bookingId }: ActionMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => console.log('Edit', bookingId)}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
      >
        <Pencil size={15} />
        Edit
      </button>

      <button
        onClick={() => console.log('Delete', bookingId)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
      >
        <Trash2 size={15} />
        Delete
      </button>
    </div>
  );
}