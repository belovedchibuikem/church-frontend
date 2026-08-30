'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BrowserUser } from '@/lib/auth-api';
import { fetchCurrentUser, type CurrentUser } from '@/lib/user-api';

type AuthContextValue = {
  /** Current session user, or null when signed out / unknown. */
  user: CurrentUser | null;
  /** True after the initial `/user/me` probe finishes (success or failure). */
  ready: boolean;
  /** Re-read the cookie session from the API. */
  refresh: () => Promise<CurrentUser | null>;
  /** Apply a known user after login/register without waiting for another round-trip. */
  setSessionUser: (user: CurrentUser | BrowserUser | null) => void;
  /** Clear local auth chrome immediately (e.g. after logout). */
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  refresh: async () => null,
  setSessionUser: () => undefined,
  clearSession: () => undefined,
});

export function browserUserToCurrentUser(user: BrowserUser | CurrentUser): CurrentUser {
  return {
    person_id: user.person_id,
    email: user.email,
    email_verified_at: user.email_verified_at,
    profile: {
      given_name: user.profile.given_name,
      middle_name: user.profile.middle_name,
      family_name: user.profile.family_name,
      preferred_name: user.profile.preferred_name,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const me = await fetchCurrentUser();
      setUser(me);
      setReady(true);
      return me;
    } catch {
      setUser(null);
      setReady(true);
      return null;
    }
  }, []);

  const setSessionUser = useCallback((next: CurrentUser | BrowserUser | null) => {
    setUser(next ? browserUserToCurrentUser(next) : null);
    setReady(true);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      refresh,
      setSessionUser,
      clearSession,
    }),
    [user, ready, refresh, setSessionUser, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
