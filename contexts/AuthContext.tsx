'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';

import { AuthState, LoginRequest, User } from '@/types/auth';
import { AuthService } from '@/services/auth.service';
import { AUTH_STORAGE_KEY } from '@/lib/auth';

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

const initialState: AuthState = {
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
};

export const AuthContext = createContext<AuthContextType>({
  ...initialState,
  login: async () => {},
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(initialState);

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      setAuth({
        user: parsed.user,
        token: parsed.token,
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

  const login = async (data: LoginRequest) => {
    const result = await AuthService.login(data);

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result));

    setAuth({
      user: result.user,
      token: result.token,
      isAuthenticated: true,
      loading: false,
    });
  };

  const logout = () => {
    AuthService.logout();

    setAuth({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  };

  const setUser = (user: User) => {
    setAuth((prev) => ({
      ...prev,
      user,
    }));
  };

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
