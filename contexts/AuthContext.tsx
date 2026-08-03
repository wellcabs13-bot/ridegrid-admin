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
  token: string;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: '',
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('ridegrid-auth');

    if (saved) {
      const user = JSON.parse(saved);

      setAuth({
        user,
        token: '',
        isAuthenticated: true,
        loading: false,
      });
    } else {
      setAuth((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, []);

  async function login(
    email: string,
    password: string
  ) {
    const result = await AuthService.login({
      email,
      password,
    });

    localStorage.setItem(
      'ridegrid-auth',
      JSON.stringify(result.user)
    );

    setAuth({
      user: result.user,
      token: '',
      isAuthenticated: true,
      loading: false,
    });
  }

  async function logout() {
    await AuthService.logout();

    localStorage.removeItem('ridegrid-auth');

    setAuth({
      user: null,
      token: '',
      isAuthenticated: false,
      loading: false,
    });
  }

  function setUser(user: User | null) {
    setAuth((prev) => ({
      ...prev,
      user,
    }));
  }

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        login,
        logout,
        setUser,
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