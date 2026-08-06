'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { AuthUser } from '@/types/auth';
import { isAuthenticated } from '@/lib/auth/auth-utils';

interface AuthGuardProps {
  user: AuthUser | null;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function AuthGuard({
  user,
  children,
  fallback,
}: AuthGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated(user)) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!isAuthenticated(user)) {
    return (
      fallback ?? (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              Authenticating...
            </h2>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}