'use client';

import { MessageCircle } from 'lucide-react';

export default function WhatsAppBroadcast() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-green-100">
          <MessageCircle className="w-6 h-6 text-green-600" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            WhatsApp Broadcast
          </h2>
          <p className="text-sm text-gray-500">
            Send promotional or support messages to customers.
          </p>
        </div>
      </div>

      <textarea
        rows={5}
        placeholder="Type your message..."
        className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      <div className="mt-4 flex justify-end">
        <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg">
          Send Broadcast
        </button>
      </div>
    </div>
  );
}