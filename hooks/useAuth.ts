'use client';

import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export default function useAuth() {
  return useAuthContext();
}