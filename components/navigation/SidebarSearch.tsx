'use client';

import { Search } from "lucide-react";

export default function SidebarSearch() {
  return (
    <div className="p-4">

      <div className="flex items-center rounded-xl border border-slate-700 bg-slate-800 px-3">

        <Search
          size={18}
          className="text-slate-500"
        />

        <input
          type="text"
          placeholder="Search..."
          className="w-full bg-transparent p-3 text-sm text-white outline-none placeholder:text-slate-500"
        />

      </div>

    </div>
  );
}