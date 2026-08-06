'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">

      <div className="rounded-3xl bg-white p-10 text-center shadow-lg">

        <ShieldAlert
          size={72}
          className="mx-auto mb-6 text-red-500"
        />

        <h1 className="mb-3 text-3xl font-bold">
          Access Denied
        </h1>

        <p className="mb-8 text-slate-500">
          You don't have permission to
          access this page.
        </p>

        <Link
          href="/dashboard"
          className="rounded-xl bg-blue-600 px-6 py-3 text-white"
        >
          Go to Dashboard
        </Link>

      </div>

    </div>
  );
}