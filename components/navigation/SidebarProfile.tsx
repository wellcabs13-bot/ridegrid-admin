'use client';

import { ChevronUp, UserCircle2 } from "lucide-react";

export default function SidebarProfile() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <UserCircle2
            size={42}
            className="text-blue-400"
          />

          <div>

            <h3 className="font-semibold text-white">
              Super Admin
            </h3>

            <p className="text-xs text-slate-400">
              administrator@ridegrid.com
            </p>

          </div>

        </div>

        <ChevronUp
          size={18}
          className="text-slate-500"
        />

      </div>

    </div>
  );
}