'use client';

import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const pageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/bookings')) return 'Bookings';
    if (pathname.startsWith('/customers')) return 'Customers';
    if (pathname.startsWith('/drivers')) return 'Drivers';
    if (pathname.startsWith('/vehicles')) return 'Vehicles';
    if (pathname.startsWith('/vendors')) return 'Vendors';
    if (pathname.startsWith('/finance')) return 'Finance';
    if (pathname.startsWith('/analytics')) return 'Analytics';
    if (pathname.startsWith('/reports')) return 'Reports';
    if (pathname.startsWith('/notifications')) return 'Notifications';
    if (pathname.startsWith('/support')) return 'CRM & Support';
    if (pathname.startsWith('/settings')) return 'Settings';

    return 'RideGrid';
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">{pageTitle()}</h1>

        <p className="text-sm text-slate-500">Welcome back, Akshay 👋</p>
      </div>

      <div className="flex items-center gap-5">
        <input
          type="text"
          placeholder="Search..."
          className="w-80 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
        />

        <button className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 transition">
          🔔
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            A
          </div>

          <div>
            <h3 className="font-semibold">Akshay</h3>

            <p className="text-xs text-slate-500">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
