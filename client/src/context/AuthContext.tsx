'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type Session = { user: User; token: string };
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  apiFetch: <T = unknown>(endpoint: string, options?: RequestInit) => Promise<T>;
  apiResponse: (endpoint: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const sessionEvent = 'workspace-session';

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(sessionEvent, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(sessionEvent, listener);
  };
}

function snapshot() {
  const session = localStorage.getItem('workspace-session');
  if (session) return session;
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  return token && user ? '{"token":' + JSON.stringify(token) + ',"user":' + user + '}' : null;
}

function readSession(value: string | null | undefined): Session | null {
  try {
    if (!value) return null;
    const session = JSON.parse(value) as Session;
    return typeof session.token === 'string' && typeof session.user?.id === 'string' &&
      typeof session.user.name === 'string' ? session : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (session) localStorage.setItem('workspace-session', JSON.stringify(session));
  else localStorage.removeItem('workspace-session');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event(sessionEvent));
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function serverSnapshot() {
  return undefined;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const session = useMemo(() => readSession(stored), [stored]);
  const router = useRouter();

  const login = useCallback((token: string, user: User) => {
    saveSession({ token, user });
    router.replace('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    saveSession(null);
    router.replace('/login');
  }, [router]);

  const apiResponse = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = readSession(snapshot())?.token;
    const headers = new Headers(options.headers);
    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) headers.set('Authorization', 'Bearer ' + token);
    const response = await fetch(apiBase + endpoint, { ...options, headers });
    if (response.ok) return response;

    if (response.status === 401 && token && readSession(snapshot())?.token === token && !endpoint.startsWith('/auth/')) logout();
    const { error } = await response.json().catch(() => ({}));
    const message = Array.isArray(error)
      ? error.map(issue => issue.message).filter(Boolean).join(' ')
      : error;
    throw new Error(typeof message === 'string' && message ? message : 'Request failed (' + response.status + ').');
  }, [logout]);

  const apiFetch = useCallback(async <T,>(endpoint: string, options?: RequestInit): Promise<T> => {
    const response = await apiResponse(endpoint, options);
    return response.json();
  }, [apiResponse]);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, loading: stored === undefined, login, logout, apiFetch, apiResponse }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
