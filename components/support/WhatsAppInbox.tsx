'use client';

import { useMemo, useState } from 'react';
import { chatConversations } from '@/data/support';

type FilterType = 'All' | 'Unread' | 'Online';

export default function WhatsAppInbox() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [activeId, setActiveId] = useState(chatConversations[0]?.id ?? 0);

  const filteredChats = useMemo(() => {
    return chatConversations.filter((chat) => {
      const matchesSearch =
        chat.customer.toLowerCase().includes(search.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === 'Unread') {
        return chat.unread > 0;
      }

      if (filter === 'Online') {
        return chat.status === 'Online';
      }

      return true;
    });
  }, [search, filter]);

  const activeChat =
    filteredChats.find((c) => c.id === activeId) ??
    filteredChats[0] ??
    chatConversations[0];

  return (
    <div className="rounded-2xl border border-green-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-green-100 px-6 py-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-green-700">WhatsApp Inbox</h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer conversations from one place.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          New Conversation
        </button>
      </div>

      <div className="grid lg:grid-cols-3">
        {/* LEFT SIDEBAR */}

        <aside className="border-r border-slate-200">
          <div className="p-4 space-y-4">
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none"
            />

            <div className="flex gap-2">
              {(['All', 'Unread', 'Online'] as FilterType[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    filter === item
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[700px] overflow-y-auto">
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveId(chat.id)}
                className={`w-full border-b border-slate-100 p-4 text-left transition hover:bg-green-50 ${
                  activeChat?.id === chat.id ? 'bg-green-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    {chat.customer}
                  </h3>

                  {chat.unread > 0 && (
                    <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
                      {chat.unread}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-500">{chat.phone}</p>

                <p className="mt-2 truncate text-sm text-slate-600">
                  {chat.lastMessage}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      chat.status === 'Online'
                        ? 'text-green-600'
                        : 'text-slate-400'
                    }`}
                  >
                    ● {chat.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* CHAT HEADER */}

        <section className="col-span-2 flex flex-col">
          <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-slate-900">
                {activeChat?.customer}
              </h3>

              <p className="text-sm text-slate-500">{activeChat?.phone}</p>
            </div>

            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
                Call
              </button>

              <button className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">
                Profile
              </button>

              <button className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                Create Ticket
              </button>
            </div>
          </div>

          {/* PART 2 STARTS HERE */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
            <div className="max-w-sm rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm">Hello, my driver has not arrived yet.</p>

              <p className="mt-2 text-right text-xs text-slate-400">10:14 AM</p>
            </div>

            <div className="ml-auto max-w-sm rounded-2xl bg-green-600 p-4 text-white shadow-sm">
              <p className="text-sm">
                We are checking with your driver. Please allow us 2 minutes.
              </p>

              <p className="mt-2 text-right text-xs text-green-100">10:15 AM</p>
            </div>

            <div className="max-w-sm rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm">Sure, thank you.</p>

              <p className="mt-2 text-right text-xs text-slate-400">10:16 AM</p>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                Greeting
              </button>

              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                Booking Update
              </button>

              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                Refund
              </button>

              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
                Delay
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-100">
                📎
              </button>

              <button className="rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-100">
                😊
              </button>

              <input
                type="text"
                placeholder="Type a WhatsApp message..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-green-600 focus:outline-none"
              />

              <button className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700">
                Send
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 border-t border-slate-200 bg-slate-50 p-6 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Customer Details</h3>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <strong>Name:</strong> {activeChat?.customer}
            </p>

            <p>
              <strong>Phone:</strong> {activeChat?.phone}
            </p>

            <p>
              <strong>Status:</strong> {activeChat?.status}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Booking</h3>

          <div className="mt-4 space-y-2 text-sm">
            <p>Current Ride</p>
            <p>Mumbai Airport Pickup</p>
            <p>Driver Assigned</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Quick Actions</h3>

          <div className="mt-4 space-y-3">
            <button className="w-full rounded-lg bg-blue-600 py-2 text-white">
              Call Customer
            </button>

            <button className="w-full rounded-lg bg-indigo-600 py-2 text-white">
              Create Ticket
            </button>

            <button className="w-full rounded-lg bg-orange-600 py-2 text-white">
              Escalate
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="font-semibold">Conversation Summary</h3>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Customer reported that the assigned driver had not yet arrived.
            Support acknowledged the request, contacted the driver, and is
            awaiting confirmation before closing the conversation.
          </p>
        </div>
      </div>
    </div>
  );
}
