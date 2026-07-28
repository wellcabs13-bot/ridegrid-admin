'use client';

import { settingsNavigation } from '@/data/settings';

interface SettingsNavigationProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function SettingsNavigation({
  activeTab,
  onChange,
}: SettingsNavigationProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-bold text-slate-900">Settings Menu</h2>
      </div>

      <div className="max-h-[700px] overflow-y-auto p-4">
        <div className="space-y-2">
          {settingsNavigation.map((item) => (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                activeTab === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-lg">{item.icon}</span>

              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
