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

      if (filter === 'Unread') return chat.unread > 0;

      if (filter === 'Online') return chat.online;

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
          <h2 className="text-xl font-bold text-green-700">
            WhatsApp Inbox
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer conversations from one place.
          </p>
        </div>

        <button className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
          New Conversation
        </button>
      </div>

      <div className="grid lg:grid-cols-3">
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
                  <h3 className="font-semibold">{chat.customer}</h3>

                  {chat.unread > 0 && (
                    <span className="rounded-full bg-green-600 px-2 py-1 text-xs text-white">
                      {chat.unread}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {chat.channel}
                </p>

                <p className="mt-2 truncate text-sm text-slate-600">
                  {chat.lastMessage}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      chat.online
                        ? 'text-green-600'
                        : 'text-slate-400'
                    }`}
                  >
                    ● {chat.online ? 'Online' : 'Offline'}
                  </span>

                  <span className="text-xs text-slate-400">
                    {chat.updatedAt}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="col-span-2 flex flex-col">
          <div className="border-b border-slate-200 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {activeChat?.customer}
              </h3>

              <p className="text-sm text-slate-500">
                {activeChat?.channel}
              </p>
            </div>

            <button className="rounded-lg bg-green-600 px-4 py-2 text-white">
              Create Ticket
            </button>
          </div>

          <div className="flex-1 bg-slate-50 p-6">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p>{activeChat?.lastMessage}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 p-5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3"
              />

              <button className="rounded-xl bg-green-600 px-6 py-3 text-white">
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}