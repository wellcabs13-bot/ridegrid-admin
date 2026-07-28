'use client';

const conversations = [
  {
    id: 1,
    customer: 'Rahul Sharma',
    phone: '+91 9876543210',
    lastMessage: 'Driver has not arrived.',
    unread: 2,
    status: 'Online',
  },
  {
    id: 2,
    customer: 'Priya Patel',
    phone: '+91 9988776655',
    lastMessage: 'Refund status?',
    unread: 1,
    status: 'Offline',
  },
  {
    id: 3,
    customer: 'Amit Verma',
    phone: '+91 9000011111',
    lastMessage: 'Thank you.',
    unread: 0,
    status: 'Offline',
  },
];

export default function WhatsAppSupport() {
  return (
    <div className="rounded-2xl border border-green-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-green-100 px-6 py-5">
        <div>
          <h2 className="text-xl font-bold text-green-700">WhatsApp Support</h2>

          <p className="mt-1 text-sm text-slate-500">
            Unified WhatsApp Business inbox.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          New Chat
        </button>
      </div>

      <div className="grid lg:grid-cols-3">
        <div className="border-r">
          {conversations.map((chat) => (
            <button
              key={chat.id}
              className="w-full border-b p-5 text-left hover:bg-green-50"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{chat.customer}</h3>

                {chat.unread > 0 && (
                  <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
                    {chat.unread}
                  </span>
                )}
              </div>

              <p className="mt-1 text-xs text-slate-500">{chat.phone}</p>

              <p className="mt-2 text-sm text-slate-600 truncate">
                {chat.lastMessage}
              </p>
            </button>
          ))}
        </div>

        <div className="col-span-2 flex flex-col">
          <div className="border-b p-5">
            <h3 className="font-semibold">Rahul Sharma</h3>

            <p className="text-sm text-green-600">Online</p>
          </div>

          <div className="flex-1 space-y-4 p-6">
            <div className="max-w-sm rounded-xl bg-slate-100 p-4">
              Driver has not arrived yet.
            </div>

            <div className="ml-auto max-w-sm rounded-xl bg-green-600 p-4 text-white">
              We are contacting your driver now.
            </div>
          </div>

          <div className="border-t p-5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Reply on WhatsApp..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none"
              />

              <button className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
