import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User as UserIcon, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sekolah, setSekolah] = useState('');

  useEffect(() => {
    api.meta()
      .then((m) => setSekolah(m.pengaturan.namaSekolah))
      .catch(() => setSekolah('Aplikasi Ujian Sekolah'));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi');
      return;
    }
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Login gagal');
      return;
    }
    navigate('/' + res.role, { replace: true });
  };

  const quick = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600">
          <ArrowLeft size={14} />
          Kembali ke Beranda
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-10">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                <GraduationCap size={24} />
              </div>
              <h1 className="text-lg font-bold text-slate-800">Masuk ke UjianOnline</h1>
              <p className="mt-1 text-xs text-slate-500">{sekolah}</p>
            </div>

            {error ? (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                <AlertCircle size={15} className="mt-px shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-4">
              <Field label="Username" htmlFor="username">
                <div className="relative">
                  <UserIcon size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="contoh: admin" autoComplete="username" className="pl-9" autoFocus />
                </div>
              </Field>

              <Field label="Password" htmlFor="password">
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password" className="pl-9" />
                </div>
              </Field>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Memproses…' : 'Masuk'}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Akun Demo</p>
              <div className="grid gap-1.5">
                {[
                  { label: 'Admin', u: 'admin', p: 'admin123' },
                  { label: 'Guru', u: 'guru1', p: 'guru123' },
                  { label: 'Murid', u: 'murid1', p: 'murid123' },
                ].map((d) => (
                  <button key={d.label} type="button" onClick={() => quick(d.u, d.p)}
                    className="flex cursor-pointer items-center justify-between rounded-md bg-white px-2.5 py-1.5 text-left text-[11px] transition-colors hover:bg-brand-50">
                    <span className="font-medium text-slate-700">{d.label}</span>
                    <span className="text-slate-500">{d.u} / {d.p}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
