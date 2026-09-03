import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, School, BookOpen, Settings, LogOut, Menu, X,
  FileQuestion, ClipboardList, MonitorPlay, BarChart3, CalendarCheck, Award, Activity,
  MessageSquareHeart, Library, Brain,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn, initial } from '@/lib/utils';
import type { Role } from '@/types';

interface NavItem { to: string; label: string; icon: ReactNode; end?: boolean }

const NAV: Record<Role, { title: string; items: NavItem[] }> = {
  admin: {
    title: 'Admin',
    items: [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
      { to: '/admin/pengguna', label: 'Data Pengguna', icon: <Users size={18} /> },
      { to: '/admin/kelas', label: 'Data Kelas', icon: <School size={18} /> },
      { to: '/admin/mapel', label: 'Mata Pelajaran', icon: <BookOpen size={18} /> },
      { to: '/admin/pengaturan', label: 'Pengaturan', icon: <Settings size={18} /> },
    ],
  },
  guru: {
    title: 'Guru',
    items: [
      { to: '/guru', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
      { to: '/guru/bank-soal', label: 'Bank Soal', icon: <FileQuestion size={18} /> },
      { to: '/guru/materi', label: 'Materi', icon: <Library size={18} /> },
      { to: '/guru/ujian', label: 'Ujian', icon: <ClipboardList size={18} /> },
      { to: '/guru/monitoring', label: 'Monitoring', icon: <MonitorPlay size={18} /> },
      { to: '/guru/nilai', label: 'Nilai & Ranking', icon: <BarChart3 size={18} /> },
      { to: '/guru/analisis', label: 'Analisis Soal', icon: <Activity size={18} /> },
      { to: '/guru/feedback', label: 'Umpan Balik', icon: <MessageSquareHeart size={18} /> },
    ],
  },
  murid: {
    title: 'Murid',
    items: [
      { to: '/murid', label: 'Dashboard', icon: <LayoutDashboard size={18} />, end: true },
      { to: '/murid/ujian', label: 'Ujian Saya', icon: <CalendarCheck size={18} /> },
      { to: '/murid/latihan', label: 'Latihan Soal', icon: <Brain size={18} /> },
      { to: '/murid/materi', label: 'Materi', icon: <BookOpen size={18} /> },
      { to: '/murid/hasil', label: 'Hasil & Nilai', icon: <Award size={18} /> },
    ],
  },
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!user) return null;

  const nav = NAV[user.role];

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">U</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">UjianOnline</p>
          <p className="truncate text-[11px] text-slate-400">Panel {nav.title}</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu"
          className="ml-auto cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {nav.items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}>
            <span className="shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-slate-800/60 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
            {initial(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] text-slate-400">@{user.username}</p>
          </div>
        </div>
        <button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-rose-600/15 hover:text-rose-400">
          <LogOut size={18} />Keluar
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative h-full w-72 max-w-[85vw]">{sidebar}</div>
        </div>
      ) : null}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu"
          className="cursor-pointer rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <Menu size={20} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-slate-800">UjianOnline</span>
          <span className="truncate text-[11px] text-slate-500">Panel {nav.title}</span>
        </div>
        <Link to={`/${user.role}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
          {initial(user.name)}
        </Link>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
