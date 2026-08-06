'use client';

import { ReactNode } from 'react';

import { AuthUser } from '@/types/auth';
import { SecurityRole } from '@/types/security';

interface RoleGuardProps {
  user: AuthUser | null;
  role: SecurityRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({
  user,
  role,
  children,
  fallback,
}: RoleGuardProps) {
  if (!user) {
    return fallback ?? null;
  }

  if (user.role !== role) {
    return (
      fallback ?? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-700">
          Access restricted to <strong>{role}</strong>.
        </div>
      )
    );
  }

  return <>{children}</>;
}