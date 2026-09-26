'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

import { AuthService } from '@/services/auth.service';

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

  useEffect(() => {
    void refreshUser();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshUser(); }, 5 * 60 * 1000);
    const restore = () => { void refreshUser(); };
    window.addEventListener("focus", restore);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", restore); };
  }, []);

  async function login(email: string, password: string) {
    const result = await AuthService.login({
  email,
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
