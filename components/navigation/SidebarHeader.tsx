'use client';

import { CarFront } from "lucide-react";

export default function SidebarHeader() {
  return (
    <div className="border-b border-slate-800 p-6">

      <div className="flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">

          <CarFront
            size={24}
            className="text-white"
          />

        </div>

        <div>

          <h1 className="text-lg font-bold text-white">
            RideGrid
          </h1>

          <p className="text-xs text-slate-400">
            Enterprise Platform
          </p>

        </div>

      </div>

    </div>
  );
}