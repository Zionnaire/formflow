'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type ApiUser, type ApiUserProfile, type ApiSecondaryProfile } from './api';

interface AuthContextValue {
  user: ApiUser | null;
  /** True only while the initial /auth/me check on load is in flight. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (patch: { primaryProfile?: Partial<ApiUserProfile>; secondaryProfiles?: ApiSecondaryProfile[] }) => Promise<void>;
  /** Re-fetches /auth/me — call after a side-channel change the context doesn't already know about (e.g. a media upload). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // One-time session check against the server on mount — there's no non-effect way to
    // learn whether the httpOnly cookie is still valid before the first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(email: string, password: string) {
    const { user } = await api.login(email, password);
    setUser(user);
  }

  async function register(email: string, password: string, fullName?: string) {
    const { user } = await api.register(email, password, fullName);
    setUser(user);
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  async function updateProfile(patch: { primaryProfile?: Partial<ApiUserProfile>; secondaryProfiles?: ApiSecondaryProfile[] }) {
    const { user } = await api.updateProfile(patch);
    setUser(user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, refreshUser: refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
