'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import UserAvatar from './UserAvatar';

export default function ProfileDropdown() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  async function logout() {
    try {
      setLoading(true);

      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Logout failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-500 hover:shadow-md"
      >
        <UserAvatar
          name="Akshay Huke"
          size="md"
          online
        />

        <div className="text-left">
          <h3 className="font-semibold text-slate-800">
            Akshay Huke
          </h3>

          <p className="text-xs text-slate-500">
            Super Administrator
          </p>
        </div>

        <svg
          className={`h-5 w-5 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">

          {/* Profile Header */}
          <div className="border-b border-slate-100 p-5">

            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>

              <span className="text-sm font-medium text-emerald-600">
                Online
              </span>
            </div>

            <div className="flex items-center gap-4">

              <UserAvatar
                name="Akshay Huke"
                size="lg"
                online
              />

              <div>
                <h2 className="font-bold text-slate-800">
                  Akshay Huke
                </h2>

                <p className="text-sm text-slate-500">
                  admin@ridegrid.in
                </p>

                <p className="mt-1 text-xs font-medium text-blue-600">
                  Super Administrator
                </p>
              </div>

            </div>

          </div>

          {/* Menu */}
          <div className="p-2">

            <MenuButton
              icon="👤"
              title="My Profile"
            />

            <MenuButton
              icon="⚙️"
              title="Account Settings"
            />

            <MenuButton
              icon="🔐"
              title="Change Password"
            />

            <MenuButton
              icon="🌙"
              title="Appearance"
            />

            <MenuButton
              icon="🌐"
              title="Language"
            />

            <MenuButton
              icon="🔔"
              title="Notifications"
            />

          </div>

          <div className="border-t border-slate-100 p-2">

            <button
              onClick={logout}
              disabled={loading}
              className="flex w-full items-center rounded-xl px-4 py-3 text-red-600 transition hover:bg-red-50"
            >
              <span className="mr-3 text-lg">🚪</span>

              {loading ? 'Logging out...' : 'Logout'}
            </button>

          </div>

        </div>
      )}
    </div>
  );
}

interface MenuButtonProps {
  icon: string;
  title: string;
}

function MenuButton({
  icon,
  title,
}: MenuButtonProps) {
  return (
    <button
      className="flex w-full items-center justify-between rounded-xl px-4 py-3 transition hover:bg-slate-100"
    >
      <div className="flex items-center gap-3">

        <span className="text-lg">
          {icon}
        </span>

        <span className="font-medium text-slate-700">
          {title}
        </span>

      </div>

      <span className="text-slate-400">
        ›
      </span>
    </button>
  );
}