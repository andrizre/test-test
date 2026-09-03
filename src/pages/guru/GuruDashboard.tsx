import { Link } from 'react-router-dom';
import { FileQuestion, ClipboardList, Users, CheckCircle2, ArrowRight, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate, statusUjian } from '@/lib/utils';

export function GuruDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(async () => {
    const [soal, ujian, mapel] = await Promise.all([
      api.soal(user?.id), api.ujian(user?.id), api.mapel(),
    ]);
    const attemptsByUjian = await Promise.all(ujian.map((u) => api.attempts({ ujianId: u.id })));
    return { soal, ujian, mapel, attempts: attemptsByUjian.flat() };
  }, [user?.id]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  const ujianAktif = data.ujian.filter((u) => statusUjian(u) === 'berlangsung');
  const belumDinilai = data.attempts.filter((a) => a.status === 'selesai' && !a.dinilai);

  const stats = [
    { label: 'Bank Soal', value: data.soal.length, icon: <FileQuestion size={20} />, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Total Ujian', value: data.ujian.length, icon: <ClipboardList size={20} />, tone: 'text-purple-600 bg-purple-50' },
    { label: 'Ujian Berlangsung', value: ujianAktif.length, icon: <Clock size={20} />, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Peserta', value: data.attempts.length, icon: <Users size={20} />, tone: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Dashboard Guru</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Selamat datang, {user?.name}</p>
        </div>
        <Link to="/guru/ujian" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto"><ClipboardList size={16} />Kelola Ujian</Button>
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

      {belumDinilai.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{belumDinilai.length} jawaban menunggu penilaian</p>
              <p className="text-[11px] text-amber-700">Segera nilai agar siswa bisa melihat hasilnya</p>
            </div>
          </div>
          <Link to="/guru/nilai" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">Nilai Sekarang</Button>
          </Link>
        </div>
      ) : null}

      <Card>
        <CardHeader title="Ujian Saya" subtitle={`${data.ujian.length} ujian`}
          action={
            <Link to="/guru/ujian" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              Lihat Semua <ArrowRight size={13} />
            </Link>
          }
        />
        {data.ujian.length === 0 ? (
          <EmptyState icon={<ClipboardList size={40} />} title="Belum ada ujian" desc="Buat ujian pertamamu dari menu Ujian" />
        ) : (
          <div className="divide-y divide-slate-200">
            {data.ujian.map((u) => {
              const st = statusUjian(u);
              const peserta = data.attempts.filter((a) => a.ujianId === u.id).length;
              return (
                <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-slate-800">{u.judul}</p>
                      <Badge tone={st === 'berlangsung' ? 'green' : st === 'akan-datang' ? 'blue' : st === 'selesai' ? 'gray' : 'amber'}>
                        {st === 'berlangsung' ? 'Berlangsung' : st === 'akan-datang' ? 'Akan Datang' : st === 'selesai' ? 'Selesai' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {data.mapel.find((m) => m.id === u.mapelId)?.nama ?? '-'} · {formatDate(u.tanggal)} · {u.durasi} menit · {peserta} peserta
                    </p>
                  </div>
                  <Link to="/guru/monitoring" className="w-full sm:w-auto">
                    <Button size="sm" variant="secondary" className="w-full sm:w-auto">Monitoring</Button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
