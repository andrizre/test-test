import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '@/types';
import { api } from '@/lib/api';

const SESSION_KEY = 'ujian-sekolah-session';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  logout: () => void;
  gantiPassword: (lama: string, baru: string) => Promise<{ ok: boolean; error?: string }>;
}

const Ctx = createContext<AuthCtx | null>(null);

function load(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(load);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await api.login(username, password);
      const u: AuthUser = { id: res.id, username: res.username, name: res.name, role: res.role as Role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true as const, role: u.role };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Login gagal' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const gantiPassword = useCallback(async (lama: string, baru: string) => {
    if (!user) return { ok: false as const, error: 'Tidak terautentikasi' };
    try {
      await api.gantiPassword(user.id, lama, baru);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : 'Gagal mengubah password' };
    }
  }, [user]);

  const value = useMemo(() => ({ user, login, logout, gantiPassword }), [user, login, logout, gantiPassword]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
