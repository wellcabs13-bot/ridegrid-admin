'use client';

import { useState } from 'react';

const tabs = [
  'All Tickets',
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
];

export default function SupportTabs() {
  const [activeTab, setActiveTab] = useState('All Tickets');

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === tab
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-gray-200 hover:bg-gray-100'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}