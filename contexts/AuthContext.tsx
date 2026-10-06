'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import { usePathname } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { isPublicWebsitePath } from '@/lib/website-public/public-paths';

interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  async function refreshUser() {
    try {
      const user = await AuthService.me();

      setAuth({
        user,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      setAuth({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  }

  // Public website pages never read the session, so anonymous visitors there are not
  // probed (no failing /api/auth/me + refresh on every page). The probe runs as soon as
  // the user reaches an app area; until then that area sees `loading`.
  const pathname = usePathname() || "/";
  const publicPage = isPublicWebsitePath(pathname);
  const [probed, setProbed] = useState(false);

  useEffect(() => {
    if (publicPage) { setAuth((a) => (a.loading ? { ...a, loading: false } : a)); return; }
    void refreshUser().finally(() => setProbed(true));
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshUser(); }, 5 * 60 * 1000);
    const restore = () => { void refreshUser(); };
    window.addEventListener("focus", restore);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", restore); };
  }, [publicPage]);

  async function login(email: string, password: string) {
    const result = await AuthService.login({
  identifier: email,
  password,
});

setAuth({
  user: result.user,
  isAuthenticated: true,
  loading: false,
   });
    return result.user as User;
  }

  async function logout() {
    await AuthService.logout();

    setAuth({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  }

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        loading: auth.loading || (!publicPage && !probed && !auth.isAuthenticated),
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
}
