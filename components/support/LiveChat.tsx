'use client';

const messages = [
  {
    id: 1,
    sender: 'Customer',
    message: 'My driver has not arrived.',
    time: '10:12 AM',
  },
  {
    id: 2,
    sender: 'Support',
    message: 'We are checking with the driver.',
    time: '10:13 AM',
  },
  {
    id: 3,
    sender: 'Customer',
    message: 'Thank you.',
    time: '10:14 AM',
  },
];

export default function LiveChat() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold">Live Chat</h2>

        <p className="mt-1 text-sm text-slate-500">
          Real-time conversation with customers, vendors and drivers.
        </p>
      </div>

      <div className="space-y-4 p-6">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`max-w-md rounded-xl p-4 ${
              item.sender === 'Support'
                ? 'ml-auto bg-indigo-600 text-white'
                : 'bg-slate-100'
            }`}
          >
            <p className="text-sm font-semibold">{item.sender}</p>

            <p className="mt-2">{item.message}</p>

            <p className="mt-2 text-xs opacity-70">{item.time}</p>
          </div>
        ))}
      </div>

      <div className="border-t p-5">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Type message..."
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-indigo-600 focus:outline-none"
          />

          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
