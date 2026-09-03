import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, GraduationCap, Users, FileQuestion, Timer, BarChart3,
  ArrowRight, CheckCircle2, Sparkles, Database,
} from 'lucide-react';
import { api } from '@/lib/api';

const FITUR = [
  { icon: <Users size={20} />, title: 'Panel Admin', desc: 'Kelola pengguna, kelas, mapel, dan pengaturan sekolah.' },
  { icon: <GraduationCap size={20} />, title: 'Panel Guru', desc: 'Buat bank soal, susun ujian, pantau peserta, dan nilai.' },
  { icon: <FileQuestion size={20} />, title: 'Panel Murid', desc: 'Ikuti ujian dengan timer dan lihat hasil nilai.' },
  { icon: <Timer size={20} />, title: 'Timer Otomatis', desc: 'Waktu dihitung mundur dan auto-submit saat habis.' },
  { icon: <BarChart3 size={20} />, title: 'Rekap Nilai', desc: 'Nilai pilihan ganda dinilai otomatis dan langsung tersimpan.' },
  { icon: <ShieldCheck size={20} />, title: 'Token Ujian', desc: 'Amankan ujian dengan token khusus per sesi.' },
];

const DEMO = [
  { role: 'Admin', user: 'admin', pass: 'admin123' },
  { role: 'Guru', user: 'guru1', pass: 'guru123' },
  { role: 'Murid', user: 'murid1', pass: 'murid123' },
];

export function LandingPage() {
  const [pengaturan, setPengaturan] = useState<{ namaSekolah: string } | null>(null);

  useEffect(() => {
    api.meta()
      .then((m) => setPengaturan(m.pengaturan))
      .catch(() => setPengaturan({ namaSekolah: 'UjianOnline' }));
  }, []);

  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">U</div>
            <div>
              <p className="text-sm font-bold text-slate-800">UjianOnline</p>
              <p className="text-[11px] text-slate-500">{pengaturan?.namaSekolah ?? 'Aplikasi Ujian Sekolah'}</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Masuk <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles size={13} />
          Aplikasi Ujian Sekolah Terpadu
        </span>
        <h1 className="mt-5 text-3xl leading-tight font-bold text-slate-900 sm:text-4xl lg:text-5xl">
          Ujian Sekolah Jadi <span className="text-brand-600">Lebih Mudah</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-600 sm:text-base">
          Satu platform untuk Admin, Guru, dan Murid. Buat soal, atur jadwal ujian, pantau peserta
          langsung, dan lihat hasil nilai — semua tersimpan di database SQLite.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 sm:w-auto"
          >
            Mulai Sekarang <ArrowRight size={16} />
          </Link>
          <a
            href="#demo"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
          >
            Lihat Akun Demo
          </a>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-xl font-bold text-slate-800 sm:text-2xl">Tiga Peran, Satu Aplikasi</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            Setiap pengguna mendapat halaman yang sesuai dengan kebutuhannya.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FITUR.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-800">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-center text-xl font-bold text-slate-800 sm:text-2xl">Akun Demo</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">Gunakan akun berikut untuk mencoba tiap peran.</p>
        <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
          {DEMO.map((d) => (
            <div key={d.role} className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-800">
                <CheckCircle2 size={15} className="text-emerald-500" />
                {d.role}
              </p>
              <div className="mt-3 space-y-1 text-xs text-slate-500">
                <p><span className="font-medium text-slate-600">Username:</span> {d.user}</p>
                <p><span className="font-medium text-slate-600">Password:</span> {d.pass}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} UjianOnline — {pengaturan?.namaSekolah ?? ''}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Database size={12} />
            Data tersimpan di database SQLite
          </p>
        </div>
      </footer>
    </div>
  );
}
