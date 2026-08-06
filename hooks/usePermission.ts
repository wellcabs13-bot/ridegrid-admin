'use client';

import { UserRole } from '@prisma/client';

import { useAuth } from '@/contexts/AuthContext';
import { Permission, hasPermission } from '@/lib/permissions';

export function usePermission() {
  const { user } = useAuth();

  function can(permission: Permission): boolean {
    if (!user) return false;

    return hasPermission(
      user.role as UserRole,
      permission
    );
  }

  return {
    can,
    user,
  };
}