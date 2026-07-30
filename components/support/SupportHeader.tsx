'use client';

import { LifeBuoy } from 'lucide-react';

export default function SupportHeader() {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
            <LifeBuoy className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Support Center
            </h1>
            <p className="text-sm text-gray-500">
              Manage customer support tickets and inquiries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}