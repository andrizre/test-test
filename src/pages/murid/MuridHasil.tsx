import { Link } from 'react-router-dom';
import { Award, TrendingUp, CheckCircle2, XCircle, FileText, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDateTime } from '@/lib/utils';

export function MuridHasil() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(async () => {
    if (!user) return null;
    const [attempts, ujian, mapel, allSoal] = await Promise.all([
      api.attemptsSaya(user.id), api.ujian(), api.mapel(), api.soal(),
    ]);
    return { attempts, ujian, mapel, allSoal };
  }, [user?.id]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error ?? 'Data tidak tersedia'} onRetry={reload} /></Card>;

  const rows = data.attempts
    .map((a) => {
      const u = data.ujian.find((x) => x.id === a.ujianId);
      if (!u) return null;
      const soalList = u.soalIds
        .map((sid) => data.allSoal.find((s) => s.id === sid))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));
      return { a, ujian: u, mapel: data.mapel.find((m) => m.id === u.mapelId), soalList, nilai: a.nilai ?? 0 };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const dinilai = rows.filter((r) => r.a.dinilai);
  const rata = dinilai.length > 0 ? Math.round(dinilai.reduce((s, r) => s + r.nilai, 0) / dinilai.length) : 0;
  const lulus = dinilai.filter((r) => r.nilai >= r.ujian.kkm).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Hasil & Nilai</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Lihat nilai ujian yang sudah kamu kerjakan</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{rows.length}</p>
          <p className="text-[11px] text-slate-500">Ujian Dikerjakan</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{dinilai.length}</p>
          <p className="text-[11px] text-slate-500">Sudah Dinilai</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><TrendingUp size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{rata}</p>
          <p className="text-[11px] text-slate-500">Rata-rata Nilai</p>
        </Card>
        <Card className="p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Award size={18} /></div>
          <p className="text-xl font-bold text-slate-800">{lulus}</p>
          <p className="text-[11px] text-slate-500">Lulus KKM</p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Award size={40} />} title="Belum ada hasil ujian" desc="Kerjakan ujian dulu untuk melihat nilainya"
            action={<Link to="/murid/ujian"><Button size="sm">Lihat Ujian</Button></Link>} />
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map(({ a, ujian, mapel, soalList, nilai }) => {
            const tampil = ujian.tampilkanNilai && a.dinilai;
            return (
              <Card key={a.id}>
                <CardHeader
                  title={ujian.judul}
                  subtitle={`${mapel?.nama ?? '-'} · Selesai ${formatDateTime(a.selesai ?? a.mulai)}`}
                  action={
                    tampil ? (
                      <Badge tone={nilai >= ujian.kkm ? 'green' : 'red'}>{nilai} / KKM {ujian.kkm}</Badge>
                    ) : (
                      <Badge tone="gray"><Lock size={11} className="mr-1" />Belum dinilai</Badge>
                    )
                  }
                />
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 sm:grid-cols-4">
                    <p>Nilai: <span className="font-medium text-slate-700">{a.nilai ?? '-'}</span></p>
                    <p>Benar: <span className="font-medium text-emerald-600">{soalList.filter((s) => a.jawaban[s.id] === s.jawaban).length}</span></p>
                    <p>Salah/Kosong: <span className="font-medium text-rose-600">{soalList.filter((s) => a.jawaban[s.id] !== s.jawaban).length}</span></p>
                    <p>Status: <span className="font-medium text-slate-700">{a.status === 'selesai' ? 'Selesai' : 'Dikerjakan'}</span></p>
                  </div>

                  {tampil ? (
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold text-slate-700">Detail Jawaban</p>
                      {soalList.map((s, i) => {
                        const ans = a.jawaban[s.id];
                        const benar = ans === s.jawaban;
                        const kosong = ans === undefined;
                        return (
                          <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-start gap-2">
                              {kosong
                                ? <XCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                                : benar
                                  ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                                  : <XCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />}
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-700"><span className="font-medium">{i + 1}. </span>{s.pertanyaan}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Jawabanmu: <span className={benar ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                                    {kosong ? 'Tidak dijawab' : `${String.fromCharCode(65 + Number(ans))}. ${s.opsi[Number(ans)]}`}
                                  </span>
                                  {!benar && !kosong ? ` · Kunci: ${String.fromCharCode(65 + s.jawaban)}. ${s.opsi[s.jawaban]}` : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      Nilai akan tampil setelah guru selesai memeriksa atau membuka nilai.
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
