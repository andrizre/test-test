import { useState } from 'react';
import { BarChart3, Users, TrendingUp, FileDown, Trophy, Medal, Timer } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { downloadCsv, toCsv } from '@/lib/csv';
import { initial, today } from '@/lib/utils';
import type { RankingItemDTO } from '@/lib/api';

function formatWaktu(detik: number): string {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

export function GuruNilai() {
  const { user } = useAuth();
  const { show } = useToast();
  const { data, loading, error, reload } = useData(() => api.ujian(user?.id), [user?.id]);
  const [pilih, setPilih] = useState('');

  const targetId = pilih || data?.[0]?.id || '';
  const target = data?.find((u) => u.id === targetId);
  const rowsData = useData(() => api.nilai(targetId), [targetId]);
  const rankData = useData(() => api.ranking(targetId).catch(() => null), [targetId]);

  const rows = rowsData.data ?? [];
  const kkm = target?.kkm ?? 75;

  const rata = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.attempt.nilai ?? 0), 0) / rows.length)
    : 0;
  const lulus = rows.filter((r) => (r.attempt.nilai ?? 0) >= kkm).length;

  const exportNilai = () => {
    if (rows.length === 0) { show('Belum ada data nilai untuk diekspor', 'error'); return; }
    const ranking = rankData.data?.list ?? [];
    const byMurid = new Map(ranking.map((r) => [r.muridId, r]));
    const header = ['No', 'Nama', 'NIS', 'Kelas', 'Nilai', 'KKM', 'Status', 'Peringkat', 'Waktu Pengerjaan'];
    const dataRows = rows.map((r, i) => {
      const a = r.attempt;
      const nilai = a.nilai ?? 0;
      const rank = byMurid.get(r.murid.id);
      const status = nilai >= kkm ? 'Lulus' : 'Tidak Lulus';
      return [i + 1, r.murid.name, r.murid.nis, rank?.kelas ?? '', nilai, kkm, status,
        rank?.rank ?? '', rank ? formatWaktu(rank.waktuDetik) : ''];
    });
    downloadCsv('rekap-nilai-' + (target?.judul || 'ujian') + '-' + today() + '.csv', toCsv(dataRows, header));
    show('Rekap nilai diekspor ke CSV');
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  if (data.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Penilaian</h1>
        <Card>
          <EmptyState icon={<BarChart3 size={40} />} title="Belum ada ujian" desc="Buat ujian dulu untuk melihat nilai" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Penilaian &amp; Ranking</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Rekap nilai otomatis dan peringkat peserta ujian</p>
        </div>
        <Button variant="secondary" onClick={exportNilai} disabled={rows.length === 0} className="w-full sm:w-auto">
          <FileDown size={16} />Ekspor Rekap
        </Button>
      </div>

      <Card>
        <div className="p-4 sm:p-5">
          <Field label="Pilih Ujian" htmlFor="n-pilih">
            <Select id="n-pilih" value={targetId} onChange={(e) => setPilih(e.target.value)}>
              {data.map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{rows.length}</p>
          <p className="text-[11px] text-slate-500">Peserta</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{rata}</p>
          <p className="text-[11px] text-slate-500">Rata-rata Nilai</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><BarChart3 size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{lulus}</p>
          <p className="text-[11px] text-slate-500">Lulus KKM ({kkm})</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><Users size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{rows.length - lulus}</p>
          <p className="text-[11px] text-slate-500">Tidak Lulus</p>
        </Card>
      </div>

      <RankingSection items={rankData.data?.list ?? []} loading={rankData.loading} error={rankData.error} onRetry={rankData.reload} />

      <Card>
        <CardHeader title="Rekap Nilai" subtitle={target?.judul ?? ''} />
        {rowsData.loading ? <Loading /> : rowsData.error ? <ErrorBox message={rowsData.error} onRetry={rowsData.reload} /> : rows.length === 0 ? (
          <EmptyState icon={<BarChart3 size={40} />} title="Belum ada yang mengerjakan" desc="Nilai muncul setelah siswa submit ujian" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-5">Siswa</th>
                  <th className="px-4 py-3 font-semibold">Kelas</th>
                  <th className="px-4 py-3 font-semibold">Nilai</th>
                  <th className="px-4 py-3 font-semibold">KKM</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rows.map(({ attempt: a, murid }) => {
                  const nilai = a.nilai ?? 0;
                  const rank = (rankData.data?.list ?? []).find((x) => x.muridId === murid.id);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                            {initial(murid.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{murid.name}</p>
                            <p className="text-[11px] text-slate-400">{murid.nis}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{rank?.kelas || '-'}</td>
                      <td className="px-4 py-3"><Badge tone={nilai >= kkm ? 'green' : 'red'}>{nilai}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{kkm}</td>
                      <td className="px-4 py-3">
                        {a.dinilai ? <Badge tone="green">Dinilai</Badge> : <Badge tone="gray">Menunggu</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const PODIUM_STYLE: Record<number, { ring: string; icon: string; label: string }> = {
  1: { ring: 'ring-2 ring-amber-400 bg-amber-50', icon: 'bg-amber-400', label: 'Juara 1' },
  2: { ring: 'ring-2 ring-slate-300 bg-slate-50', icon: 'bg-slate-400', label: 'Juara 2' },
  3: { ring: 'ring-2 ring-orange-300 bg-orange-50', icon: 'bg-orange-400', label: 'Juara 3' },
};

function RankingSection({ items, loading, error, onRetry }: {
  items: RankingItemDTO[]; loading: boolean; error: string; onRetry: () => void;
}) {
  if (loading) return <Card><Loading /></Card>;
  if (error) return <ErrorBox message={error} onRetry={onRetry} />;

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader title="Ranking Peserta" subtitle="Peringkat berdasarkan nilai tertinggi" />
        <EmptyState icon={<Trophy size={40} />} title="Belum ada ranking" desc="Ranking muncul setelah ada siswa yang menyelesaikan ujian" />
      </Card>
    );
  }

  const podium = items.slice(0, 3);
  const sisanya = items.slice(3);

  return (
    <Card>
      <CardHeader title="Ranking Peserta" subtitle={`${items.length} peserta · diurutkan dari nilai tertinggi`} />
      {podium.length > 0 ? (
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-3">
          {podium.map((r) => {
            const style = PODIUM_STYLE[r.rank];
            return (
              <div key={r.muridId} className={`flex items-center gap-3 rounded-xl p-3 ${style.ring}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${style.icon}`}>
                  {r.rank === 1 ? <Trophy size={18} /> : <Medal size={18} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{r.nama}</p>
                  <p className="text-[11px] text-slate-500">{style.label} · {r.kelas || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tabular-nums text-slate-800">{r.nilai}</p>
                  <p className="flex items-center justify-end gap-1 text-[10px] text-slate-400"><Timer size={10} />{formatWaktu(r.waktuDetik)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {sisanya.length > 0 ? (
        <div className="divide-y divide-slate-100">
          {sisanya.map((r) => (
            <div key={r.muridId} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="w-7 shrink-0 text-xs font-bold text-slate-400">#{r.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{r.nama}</p>
                <p className="text-[11px] text-slate-400">{r.kelas || '-'} · {r.nis || '-'}</p>
              </div>
              <span className="text-[11px] text-slate-400">{formatWaktu(r.waktuDetik)}</span>
              <Badge tone={r.nilai >= 75 ? 'green' : 'gray'}>{r.nilai}</Badge>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
