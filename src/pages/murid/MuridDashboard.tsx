import { Link } from 'react-router-dom';
import { CalendarCheck, Award, Clock, CheckCircle2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate, statusUjian } from '@/lib/utils';

export function MuridDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(async () => {
    if (!user) return null;
    const [ujian, attempts, kelas, users, mapel] = await Promise.all([
      api.ujian(), api.attemptsSaya(user.id), api.kelas(), api.users(), api.mapel(),
    ]);
    return { ujian, attempts, kelas, users, mapel };
  }, [user?.id]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data || !user) return <Card><ErrorBox message={error ?? 'Data tidak tersedia'} onRetry={reload} /></Card>;

  const kelasId = data.users.find((u) => u.id === user.id)?.kelasId;
  const ujianUntukku = data.ujian.filter((u) => u.status === 'publish' && u.kelasIds.includes(kelasId ?? ''));
  const selesai = data.attempts.filter((a) => a.status === 'selesai');

  const rataRata = selesai.length > 0
    ? Math.round(selesai.reduce((s, a) => s + (a.nilai ?? 0), 0) / selesai.length)
    : 0;

  const tersedia = ujianUntukku.filter((u) => !data.attempts.some((a) => a.ujianId === u.id && a.status === 'selesai'));
  const berlangsung = ujianUntukku.filter((u) => statusUjian(u) === 'berlangsung');

  const stats = [
    { label: 'Ujian Tersedia', value: tersedia.length, icon: <CalendarCheck size={20} />, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Sedang Berlangsung', value: berlangsung.length, icon: <Clock size={20} />, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Ujian Selesai', value: selesai.length, icon: <CheckCircle2 size={20} />, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Rata-rata Nilai', value: rataRata, icon: <Award size={20} />, tone: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Dashboard Murid</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Halo, {user.name} · Kelas {data.kelas.find((k) => k.id === kelasId)?.nama ?? '-'}
          </p>
        </div>
        <Link to="/murid/ujian" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto"><FileText size={16} />Lihat Ujian</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>{s.icon}</div>
            <p className="text-xl font-bold text-slate-800 sm:text-2xl">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Ujian Mendatang" subtitle="Ujian yang bisa kamu kerjakan"
          action={
            <Link to="/murid/ujian" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              Semua <span aria-hidden>→</span>
            </Link>
          }
        />
        {tersedia.length === 0 ? (
          <EmptyState icon={<CalendarCheck size={40} />} title="Tidak ada ujian" desc="Ujian baru akan muncul di sini" />
        ) : (
          <div className="divide-y divide-slate-200">
            {tersedia.slice(0, 5).map((u) => {
              const st = statusUjian(u);
              return (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-800">{u.judul}</p>
                      <Badge tone={st === 'berlangsung' ? 'green' : st === 'akan-datang' ? 'blue' : 'gray'}>
                        {st === 'berlangsung' ? 'Berlangsung' : st === 'akan-datang' ? 'Akan Datang' : 'Selesai'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {data.mapel.find((m) => m.id === u.mapelId)?.nama ?? '-'} · {formatDate(u.tanggal)} · {u.jamMulai} · {u.durasi} menit · {u.soalIds.length} soal
                    </p>
                  </div>
                  <Link to={`/murid/ujian/${u.id}`} className="w-full sm:w-auto">
                    <Button size="sm" className="w-full sm:w-auto" disabled={st !== 'berlangsung'}>
                      {st === 'berlangsung' ? 'Kerjakan' : 'Tutup'}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selesai.length > 0 ? (
        <Card>
          <CardHeader title="Nilai Terbaru" subtitle="Hasil ujian yang sudah dinilai" />
          <div className="divide-y divide-slate-200">
            {selesai.slice(0, 5).map((a) => {
              const u = data.ujian.find((x) => x.id === a.ujianId);
              if (!u) return null;
              const nilai = a.nilai ?? 0;
              return (
                <Link key={a.id} to="/murid/hasil" className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{u.judul}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(a.selesai ?? a.mulai)}</p>
                  </div>
                  <Badge tone={nilai >= u.kkm ? 'green' : 'red'}>{nilai}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
