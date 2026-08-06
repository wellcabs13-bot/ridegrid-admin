'use client';

import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';

import { Permission, hasPermission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <>{fallback}</>;

  const allowed = hasPermission(
    user.role as UserRole,
    permission
  );

  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
}