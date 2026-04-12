import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchMe,
  login as loginApi,
  register as registerApi,
} from '../api/client';
import type { UserProfile } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  loading: boolean;
  token: string | null;
  user: UserProfile | null;
  setAuthSession: (token: string, user: UserProfile) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const TOKEN_KEY = 'career_copilot_jwt';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const setAuthSession = (nextToken: string, nextUser: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setStatus('authenticated');
  };

  const login = async (email: string, password: string) => {
    const data = await loginApi({ email, password });
    setAuthSession(data.access_token, data.user);
  };

  const register = async (email: string, password: string) => {
    const data = await registerApi({ email, password });
    setAuthSession(data.access_token, data.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  };

  const refreshMe = async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      logout();
      return;
    }
    try {
      const me = await fetchMe();
      setToken(storedToken);
      setUser(me);
      setStatus('authenticated');
    } catch {
      logout();
    }
  };

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      loading: status === 'loading',
      token,
      user,
      setAuthSession,
      login,
      register,
      logout,
      refreshMe,
    }),
    [status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен вызываться внутри AuthProvider');
  return ctx;
}
