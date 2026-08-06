'use client';

import { ReactNode } from 'react';

import { AuthUser } from '@/types/auth';
import { SecurityRole } from '@/types/security';

interface PermissionGuardProps {
  user: AuthUser | null;
  allowedRoles: SecurityRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  user,
  allowedRoles,
  children,
  fallback,
}: PermissionGuardProps) {
  if (!user) {
    return fallback ?? null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      fallback ?? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          You don't have permission to access this resource.
        </div>
      )
    );
  }

  return <>{children}</>;
}