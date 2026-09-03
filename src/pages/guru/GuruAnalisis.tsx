import { useState } from 'react';
import { BarChart3, CircleCheck, Target, Sigma } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Card, CardHeader, EmptyState, Field, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { cn } from '@/lib/utils';

function difficulty(pctBenar: number): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (pctBenar >= 70) return { label: 'Mudah', tone: 'green' };
  if (pctBenar >= 40) return { label: 'Sedang', tone: 'amber' };
  return { label: 'Sulit', tone: 'red' };
}

export function GuruAnalisis() {
  const { user } = useAuth();
  const { data, loading, error } = useData(() => api.ujian(user?.id), [user?.id]);
  const [pilih, setPilih] = useState('');

  const targetId = pilih || data?.[0]?.id || '';
  const target = data?.find((u) => u.id === targetId);
  const statData = useData(() => api.statistik(targetId), [targetId]);

  const stat = statData.data;
  const soalStats = stat?.soal ?? [];
  const peserta = stat?.peserta ?? 0;

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={() => undefined} /></Card>;

  if (data.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Analisis Soal</h1>
        <Card>
          <EmptyState icon={<Target size={40} />} title="Belum ada ujian" desc="Buat atau publikasikan ujian dulu untuk melihat analisis" />
        </Card>
      </div>
    );
  }

  const pctBenarKeseluruhan = soalStats.length > 0 && peserta > 0
    ? Math.round(soalStats.reduce((s, x) => s + x.pctBenar, 0) / soalStats.length)
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Analisis Soal</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Statistik nilai dan distribusi jawaban per soal</p>
      </div>

      <Card>
        <div className="p-4 sm:p-5">
          <Field label="Pilih Ujian" htmlFor="a-pilih">
            <Select id="a-pilih" value={targetId} onChange={(e) => setPilih(e.target.value)}>
              {data.map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Target size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{soalStats.length}</p>
          <p className="text-[11px] text-slate-500">Total Soal</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><BarChart3 size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{peserta}</p>
          <p className="text-[11px] text-slate-500">Peserta Mengerjakan</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><CircleCheck size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{pctBenarKeseluruhan}%</p>
          <p className="text-[11px] text-slate-500">Rata-rata Kebenaran</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Sigma size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{stat?.nilai.stDev ?? 0}</p>
          <p className="text-[11px] text-slate-500">Standar Deviasi</p>
        </Card>
      </div>

      {peserta > 0 ? (
        <Card>
          <CardHeader title="Statistik Nilai" subtitle={target?.judul ?? ''} action={<Badge tone="blue">KKM {stat?.kkm ?? 0}</Badge>} />
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
            {[
              { label: 'Rata-rata', value: stat?.nilai.rata ?? 0, tone: 'text-brand-600' },
              { label: 'Median', value: stat?.nilai.median ?? 0, tone: 'text-slate-700' },
              { label: 'Tertinggi', value: stat?.nilai.tertinggi ?? 0, tone: 'text-emerald-600' },
              { label: 'Terendah', value: stat?.nilai.terendah ?? 0, tone: 'text-rose-600' },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-slate-50 px-4 py-3 text-center">
                <p className={cn('text-2xl font-black tabular-nums', x.tone)}>{x.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{x.label}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {statData.loading ? <Loading /> : statData.error ? <ErrorBox message={statData.error} onRetry={statData.reload} /> : soalStats.length === 0 ? (
        <Card>
          <EmptyState icon={<Target size={40} />} title="Belum ada data" desc="Belum ada siswa yang mengerjakan ujian ini" />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Statistik Per Soal" subtitle={target?.judul ?? ''} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold sm:px-5">No</th>
                    <th className="px-4 py-3 font-semibold">Soal</th>
                    <th className="px-4 py-3 font-semibold">Bobot</th>
                    <th className="px-4 py-3 font-semibold text-emerald-600">Benar</th>
                    <th className="px-4 py-3 font-semibold text-rose-600">Salah</th>
                    <th className="px-4 py-3 font-semibold">Kosong</th>
                    <th className="px-4 py-3 font-semibold">% Benar</th>
                    <th className="px-4 py-3 font-semibold">Tingkat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {soalStats.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400 sm:px-5">{s.no}</td>
                      <td className="max-w-64 px-4 py-3">
                        <p className="truncate font-medium text-slate-700">{s.pertanyaan}</p>
                        <p className="text-[11px] text-emerald-600">Kunci: {String.fromCharCode(65 + s.kunci)}. {s.opsi[s.kunci]}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.bobot}</td>
                      <td className="px-4 py-3 text-emerald-600">{s.benar}</td>
                      <td className="px-4 py-3 text-rose-600">{s.salah}</td>
                      <td className="px-4 py-3 text-slate-600">{s.kosong}</td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-slate-700">{s.pctBenar}%</span>
                          <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: s.pctBenar + '%' }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={difficulty(s.pctBenar).tone}>{difficulty(s.pctBenar).label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {peserta > 0 ? (
            <Card>
              <CardHeader title="Distribusi Jawaban Per Soal" subtitle="Persentase pemilihan opsi A-E oleh peserta (hijau = kunci)" />
              <div className="space-y-4 p-4 sm:p-5">
                {soalStats.map((s) => (
                  <div key={s.id}>
                    <p className="mb-1.5 text-xs font-medium text-slate-700">{s.no}. {s.pertanyaan}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {s.distribusi.map((count, i) => {
                        const pct = peserta > 0 ? Math.round((count / peserta) * 100) : 0;
                        const kunci = i === s.kunci;
                        return (
                          <div key={i} className="rounded-lg border border-slate-200 px-2 py-2 text-center">
                            <span className={cn('text-[11px] font-bold', kunci ? 'text-emerald-600' : 'text-slate-500')}>
                              {String.fromCharCode(65 + i)}{kunci ? ' ✓' : ''}
                            </span>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div className={cn('h-full rounded-full', kunci ? 'bg-emerald-500' : 'bg-slate-400')} style={{ width: pct + '%' }} />
                            </div>
                            <p className="mt-1 text-[10px] tabular-nums text-slate-400">{pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
