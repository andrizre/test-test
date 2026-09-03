import { useEffect, useState } from 'react';
import { MonitorPlay, Users, CheckCircle2, Clock, AlertCircle, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Card, CardHeader, EmptyState, Field, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDateTime, initial } from '@/lib/utils';

export function GuruMonitoring() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(() => api.ujian(user?.id), [user?.id]);
  const [pilih, setPilih] = useState('');
  const [autoTick, setAutoTick] = useState(0);

  const targetId = pilih || data?.[0]?.id || '';
  const target = data?.find((u) => u.id === targetId);

  const mon = useData(() => api.monitoring(targetId), [targetId, autoTick]);

  // Refresh otomatis tiap 10 detik
  useEffect(() => {
    const t = setInterval(() => setAutoTick((x) => x + 1), 10000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  if (data.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Monitoring Ujian</h1>
        <Card>
          <EmptyState icon={<MonitorPlay size={40} />} title="Belum ada ujian" desc="Buat ujian dulu untuk memantau peserta" />
        </Card>
      </div>
    );
  }

  const peserta = mon.data ?? [];
  const selesai = peserta.filter((p) => p.attempt?.status === 'selesai').length;
  const mengerjakan = peserta.filter((p) => p.attempt?.status === 'mengerjakan').length;
  const belum = peserta.length - selesai - mengerjakan;
  const totalSoal = target?.soalIds.length ?? 0;
  const totalPelanggaran = peserta.reduce((s, p) => s + (p.attempt?.pelanggaran ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Monitoring Ujian</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Pantau peserta ujian secara langsung</p>
      </div>

      <Card>
        <div className="p-4 sm:p-5">
          <Field label="Pilih Ujian" htmlFor="m-pilih">
            <Select id="m-pilih" value={targetId} onChange={(e) => setPilih(e.target.value)}>
              {data.map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{peserta.length}</p>
          <p className="text-[11px] text-slate-500">Total Peserta</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Clock size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{mengerjakan}</p>
          <p className="text-[11px] text-slate-500">Sedang Mengerjakan</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{selesai}</p>
          <p className="text-[11px] text-slate-500">Selesai</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><AlertCircle size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{belum}</p>
          <p className="text-[11px] text-slate-500">Belum Mulai</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><ShieldAlert size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{totalPelanggaran}</p>
          <p className="text-[11px] text-slate-500">Pelanggaran</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Status Peserta"
          subtitle={`${target?.judul ?? ''} · ${totalSoal} soal · ${target?.durasi ?? 0} menit`}
          action={<Badge tone={mengerjakan > 0 ? 'green' : 'gray'}>{mengerjakan > 0 ? 'Live' : 'Tidak Aktif'}</Badge>}
        />
        {mon.loading ? <Loading /> : mon.error ? <ErrorBox message={mon.error} onRetry={mon.reload} /> : peserta.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="Tidak ada peserta" desc="Belum ada siswa di kelas yang dipilih" />
        ) : (
          <div className="divide-y divide-slate-200">
            {peserta.map(({ murid, attempt }) => {
              const terjawab = attempt ? Object.keys(attempt.jawaban).length : 0;
              const pct = totalSoal > 0 ? Math.round((terjawab / totalSoal) * 100) : 0;
              const st = attempt?.status === 'selesai' ? 'Selesai' : attempt ? 'Mengerjakan' : 'Belum Mulai';
              const tone = attempt?.status === 'selesai' ? 'green' : attempt ? 'amber' : 'gray';
              return (
                <div key={murid.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                        {initial(murid.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{murid.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {murid.nis || '-'}{attempt ? ` · Mulai ${formatDateTime(attempt.mulai)}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{terjawab}/{totalSoal}</span>
                      {(attempt?.pelanggaran ?? 0) > 0 ? (
                        <Badge tone="red">
                          <ShieldAlert size={11} className="mr-1" />{attempt?.pelanggaran}x keluar tab
                        </Badge>
                      ) : null}
                      <Badge tone={tone}>{st}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: pct + '%' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
