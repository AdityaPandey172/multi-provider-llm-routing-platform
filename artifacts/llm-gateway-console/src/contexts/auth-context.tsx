import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; scope: string }
  | { status: 'unauthenticated' };

type AuthContextValue = {
  authState: AuthState;
  logout: () => Promise<void>;
  /** Call after a successful login to refresh auth state without a full page reload. */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchAuthMe(): Promise<AuthState> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    if (res.ok) {
      const body = (await res.json()) as { authenticated: boolean; scope?: string };
      return body.authenticated
        ? { status: 'authenticated', scope: body.scope ?? 'operator' }
        : { status: 'unauthenticated' };
    }
    return { status: 'unauthenticated' };
  } catch {
    return { status: 'unauthenticated' };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    setAuthState({ status: 'loading' });
    setAuthState(await fetchAuthMe());
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // ignore network errors — cookie will expire anyway
    }
    setAuthState({ status: 'unauthenticated' });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ authState, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
