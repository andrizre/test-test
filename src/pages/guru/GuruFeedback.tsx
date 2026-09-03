import { useState } from 'react';
import { MessageSquareHeart, Star, Users, TrendingUp, Gauge } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Card, CardHeader, EmptyState, Field, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDateTime, initial } from '@/lib/utils';
import { cn } from '@/lib/utils';

const KESULITAN_TONE: Record<string, string> = { mudah: 'green', sedang: 'amber', sulit: 'red' };
const KESULITAN_LABEL: Record<string, string> = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };

export function GuruFeedback() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(() => api.ujian(user?.id), [user?.id]);
  const [pilih, setPilih] = useState('');

  const targetId = pilih || data?.[0]?.id || '';
  const target = data?.find((u) => u.id === targetId);
  const fbData = useData(() => api.feedback(targetId), [targetId]);

  const rekap = fbData.data?.rekap;
  const list = fbData.data?.list ?? [];

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  if (data.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Umpan Balik</h1>
        <Card>
          <EmptyState icon={<MessageSquareHeart size={40} />} title="Belum ada ujian" desc="Buat ujian dulu untuk menerima ulasan siswa" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Umpan Balik Siswa</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Rating dan ulasan siswa setelah menyelesaikan ujian</p>
      </div>

      <Card>
        <div className="p-4 sm:p-5">
          <Field label="Pilih Ujian" htmlFor="fb-pilih">
            <Select id="fb-pilih" value={targetId} onChange={(e) => setPilih(e.target.value)}>
              {data.map((u) => <option key={u.id} value={u.id}>{u.judul}</option>)}
            </Select>
          </Field>
        </div>
      </Card>

      {fbData.loading ? <Loading /> : fbData.error ? <ErrorBox message={fbData.error} onRetry={fbData.reload} /> : (
        (rekap?.total ?? 0) === 0 ? (
          <Card>
            <EmptyState icon={<MessageSquareHeart size={40} />} title="Belum ada ulasan"
              desc="Ulasan muncul setelah siswa mengisi feedback di halaman selesai ujian" />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card className="p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users size={18} /></div>
                <p className="text-xl font-bold text-slate-800">{rekap?.total}</p>
                <p className="text-[11px] text-slate-500">Total Respon</p>
              </Card>
              <Card className="p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Star size={18} /></div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold text-slate-800">{rekap?.rataRating}</p>
                  <Bintang nilai={Math.round(rekap?.rataRating ?? 0)} size={13} />
                </div>
                <p className="text-[11px] text-slate-500">Rata-rata Rating</p>
              </Card>
              <Card className="p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><Gauge size={18} /></div>
                <p className="text-xl font-bold text-slate-800">{rekap?.kesulitan.sulit ?? 0}</p>
                <p className="text-[11px] text-slate-500">Bilang Sulit</p>
              </Card>
              <Card className="p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><TrendingUp size={18} /></div>
                <p className="text-xl font-bold text-slate-800">{rekap?.kesulitan.mudah ?? 0}</p>
                <p className="text-[11px] text-slate-500">Bilang Mudah</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              <Card>
                <CardHeader title="Distribusi Rating" />
                <div className="space-y-2.5 p-4">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const count = rekap?.distribusi[String(n)] ?? 0;
                    const pct = (rekap?.total ?? 0) > 0 ? Math.round((count / (rekap?.total ?? 1)) * 100) : 0;
                    return (
                      <div key={n} className="flex items-center gap-2">
                        <span className="flex w-8 items-center gap-0.5 text-xs font-semibold text-slate-600">{n}<Star size={11} className="fill-current text-amber-400" /></span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: pct + '%' }} />
                        </div>
                        <span className="w-8 text-right text-[11px] tabular-nums text-slate-500">{count}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-slate-100 pt-3">
                    <p className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Tingkat Kesulitan</p>
                    <div className="flex gap-2">
                      {(['mudah', 'sedang', 'sulit'] as const).map((k) => (
                        <Badge key={k} tone={KESULITAN_TONE[k]}>{KESULITAN_LABEL[k]}: {rekap?.kesulitan[k] ?? 0}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Komentar Siswa" subtitle={`${list.filter((f) => f.komentar).length} komentar · ${target?.judul ?? ''}`} />
                <div className="divide-y divide-slate-100">
                  {list.map((f) => (
                    <div key={f.id} className="p-4 sm:px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                          {initial(f.murid?.name ?? '?')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{f.murid?.name}</p>
                          <p className="text-[11px] text-slate-400">{formatDateTime(f.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Bintang nilai={f.rating} size={13} />
                          <Badge tone={KESULITAN_TONE[f.kesulitan]}>{KESULITAN_LABEL[f.kesulitan]}</Badge>
                        </div>
                      </div>
                      {f.komentar ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">{f.komentar}</p>
                      ) : (
                        <p className="mt-2 text-[11px] text-slate-400 italic">Tanpa komentar</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )
      )}
    </div>
  );
}

export function Bintang({ nilai, size = 14 }: { nilai: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={cn(n <= nilai ? 'fill-current text-amber-400' : 'text-slate-300')} />
      ))}
    </span>
  );
}
