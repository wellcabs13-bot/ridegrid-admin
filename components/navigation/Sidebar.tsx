'use client';

import { useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import SidebarHeader from './SidebarHeader';
import SidebarSearch from './SidebarSearch';
import SidebarProfile from './SidebarProfile';
import SidebarFooter from './SidebarFooter';
import NavigationGroup from './NavigationGroup';

import { navigation } from './navigation-data';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r border-slate-800 bg-slate-900 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-80'
      }`}
    >
      {/* Header */}

      <div className="relative">

        <SidebarHeader />

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-4 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-white shadow-lg transition hover:bg-slate-700"
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>

      </div>

      {/* Search */}

      {!collapsed && <SidebarSearch />}

      {/* Navigation */}

      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">

        <div className="space-y-4">

          {navigation.map((group) => (
            <NavigationGroup
              key={group.title}
              group={group}
            />
          ))}

        </div>

      </div>

      {/* Profile */}

      {!collapsed && (
        <div className="border-t border-slate-800 p-4">

          <SidebarProfile />

        </div>
      )}

      {/* Footer */}

      {!collapsed && (
        <div className="border-t border-slate-800 p-4">

          <SidebarFooter />

        </div>
      )}

      {/* Mobile */}

      <button className="absolute bottom-4 right-4 rounded-full bg-blue-600 p-3 text-white shadow lg:hidden">
        <Menu size={20} />
      </button>
    </aside>
  );
}