'use client';

import { ShieldCheck, Lock } from 'lucide-react';

export default function SecurityOverview() {
  return (
    <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-lg">

      <div className="flex items-center justify-between">

        <div>

          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <ShieldCheck className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold">
            Security Center
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            Authentication, RBAC, audit logs,
            sessions, permissions and enterprise
            security management.
          </p>

        </div>

        <Lock className="hidden h-20 w-20 lg:block opacity-40" />

      </div>

    </div>
  );
}