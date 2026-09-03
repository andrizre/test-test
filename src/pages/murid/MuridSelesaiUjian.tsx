import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Trophy, Award, ChevronLeft, ChevronRight, Star,
  MessageSquareHeart, Loader2, Lock,
} from 'lucide-react';
import { api, type UjianDTO, type AttemptDTO, type SoalDTO, type RankingResultDTO, type FeedbackResultDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select, Textarea } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { cn } from '@/lib/utils';

export function MuridSelesaiUjian() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useData(async () => {
    if (!id || !user) return null;
    const [ujian, attempts, allSoal, mapel, ranking, fb] = await Promise.all([
      api.ujianById(id), api.attemptsSaya(user.id), api.soal(), api.mapel(),
      api.ranking(id).catch(() => null), api.feedback(id).catch(() => null),
    ]);
    return { ujian, attempts, allSoal, mapel, ranking, fb };
  }, [id, user?.id]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  const ujian = data.ujian as UjianDTO;
  const attempt = data.attempts.find((a) => a.ujianId === id && a.status === 'selesai') as AttemptDTO | undefined;
  if (!ujian || !attempt) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-600">Hasil ujian tidak ditemukan.</p>
        <Link to="/murid/ujian" className="mt-3 inline-block"><Button size="sm" variant="secondary">Kembali</Button></Link>
      </Card>
    );
  }

  const soalList = ujian.soalIds
    .map((sid) => (data.allSoal as SoalDTO[]).find((s) => s.id === sid))
    .filter((s): s is SoalDTO => Boolean(s));

  const nilai = attempt.nilai ?? 0;
  const tampilNilai = ujian.tampilkanNilai && attempt.dinilai;
  const benar = soalList.filter((s) => attempt.jawaban[s.id] === s.jawaban).length;
  const kosong = soalList.filter((s) => attempt.jawaban[s.id] === undefined).length;
  const salah = soalList.length - benar - kosong;
  const lulus = nilai >= ujian.kkm;

  const ranking = (data.ranking ?? null) as RankingResultDTO | null;
  const rankSaya = ranking?.list.find((r) => r.muridId === user?.id) ?? null;
  const sudahFeedback = (data.fb as FeedbackResultDTO | null)?.list.some((f) => f.muridId === user?.id) ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="overflow-hidden">
        <div className={cn('flex flex-col items-center px-6 py-8 text-center', lulus && tampilNilai ? 'bg-emerald-50' : 'bg-slate-50')}>
          <div className={cn('mb-3 flex h-16 w-16 items-center justify-center rounded-full',
            tampilNilai ? (lulus ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600') : 'bg-brand-100 text-brand-600')}>
            {tampilNilai ? <Award size={32} /> : <CheckCircle2 size={32} />}
          </div>
          <h1 className="text-lg font-bold text-slate-800">{tampilNilai ? (lulus ? 'Selamat, Kamu Lulus!' : 'Belum Mencapai KKM') : 'Ujian Selesai'}</h1>
          <p className="mt-1 text-xs text-slate-500">{ujian.judul}</p>

          {tampilNilai ? (
            <div className="mt-4 flex items-end gap-1.5">
              <span className={cn('text-5xl font-black tabular-nums', lulus ? 'text-emerald-600' : 'text-rose-600')}>{nilai}</span>
              <span className="pb-1.5 text-sm font-medium text-slate-400">/ 100</span>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
              <Lock size={13} />Nilai belum ditampilkan oleh guru
            </p>
          )}

          <div className="mt-5 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-bold text-emerald-600">{benar}</p>
              <p className="text-[10px] text-slate-500">Benar</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-bold text-rose-600">{salah}</p>
              <p className="text-[10px] text-slate-500">Salah</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-bold text-amber-600">{kosong}</p>
              <p className="text-[10px] text-slate-500">Kosong</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
              <p className="text-lg font-bold text-slate-700">{rankSaya ? `${rankSaya.rank}` : '-'}</p>
              <p className="text-[10px] text-slate-500">Peringkat{rankSaya ? ` dari ${ranking?.total}` : ''}</p>
            </div>
          </div>
        </div>
      </Card>

      <DetailJawaban soalList={soalList} jawaban={attempt.jawaban} />

      {sudahFeedback ? (
        <Card className="p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><MessageSquareHeart size={24} /></div>
          <p className="text-sm font-medium text-slate-800">Terima kasih, ulasanmu sudah terkirim!</p>
          <p className="mt-1 text-xs text-slate-500">Masukanmu membantu guru meningkatkan kualitas ujian.</p>
          <Button className="mt-4" onClick={() => navigate('/murid/hasil')}>Lihat Semua Hasil</Button>
        </Card>
      ) : (
        <FormFeedback ujianId={ujian.id} muridId={user?.id ?? ''} onDone={() => navigate('/murid/hasil')} />
      )}
    </div>
  );
}

function DetailJawaban({ soalList, jawaban }: { soalList: SoalDTO[]; jawaban: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Review Jawaban"
        subtitle="Bandingkan jawabanmu dengan kunci"
        action={
          <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}{open ? 'Sembunyikan' : 'Tampilkan'}
          </Button>
        }
      />
      {open ? (
        <div className="space-y-2 p-4">
          {soalList.length === 0 ? <EmptyState title="Soal tidak tersedia" /> : soalList.map((s, i) => {
            const ans = jawaban[s.id];
            const kosong = ans === undefined;
            const benar = !kosong && ans === s.jawaban;
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
                        {kosong ? 'Tidak dijawab' : `${String.fromCharCode(65 + ans)}. ${s.opsi[ans]}`}
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
        <p className="px-4 py-3 text-[11px] text-slate-400">Klik Tampilkan untuk melihat pembahasan per soal.</p>
      )}
    </Card>
  );
}

function FormFeedback({ ujianId, muridId, onDone }: { ujianId: string; muridId: string; onDone: () => void }) {
  const { show } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [kesulitan, setKesulitan] = useState('');
  const [komentar, setKomentar] = useState('');
  const [sending, setSending] = useState(false);

  const kirim = async () => {
    if (rating < 1) { show('Beri rating bintang dulu (1-5)', 'error'); return; }
    if (!kesulitan) { show('Pilih tingkat kesulitan ujian', 'error'); return; }
    setSending(true);
    try {
      await api.kirimFeedback({ ujianId, muridId, rating, kesulitan, komentar: komentar.trim() });
      show('Terima kasih atas ulasanmu!');
      onDone();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal mengirim ulasan', 'error');
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Bagaimana Pengalaman Ujianmu?"
        subtitle="Ulasanmu membantu guru membuat ujian yang lebih baik"
        action={<Badge tone="purple"><MessageSquareHeart size={11} className="mr-1" />Feedback</Badge>}
      />
      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">Rating Ujian</p>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rating 1 sampai 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`Beri ${n} bintang`}
                className={cn('cursor-pointer rounded-md p-1 transition-transform hover:scale-110',
                  (hover || rating) >= n ? 'text-amber-400' : 'text-slate-300')}
              >
                <Star size={30} className={cn((hover || rating) >= n && 'fill-current')} />
              </button>
            ))}
          </div>
          {rating > 0 ? (
            <p className="mt-1.5 text-[11px] text-slate-500">
              {['', 'Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'][rating]}
            </p>
          ) : null}
        </div>

        <Field label="Tingkat Kesulitan Ujian" htmlFor="fb-kesulitan">
          <Select id="fb-kesulitan" value={kesulitan} onChange={(e) => setKesulitan(e.target.value)}>
            <option value="">— Pilih —</option>
            <option value="mudah">Mudah</option>
            <option value="sedang">Sedang</option>
            <option value="sulit">Sulit</option>
          </Select>
        </Field>

        <Field label="Komentar (opsional)" htmlFor="fb-komentar">
          <Textarea
            id="fb-komentar" value={komentar} onChange={(e) => setKomentar(e.target.value)}
            placeholder="Ceritakan pengalamanmu: soal, waktu, tampilan, atau saran untuk guru…"
          />
        </Field>

        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {sending ? <><Loader2 size={12} className="animate-spin" />Mengirim…</> : <><Trophy size={12} />Ulasan bersifat privat antara kamu dan guru</>}
          </p>
          <Button onClick={() => void kirim()} disabled={sending}>
            {sending ? 'Mengirim…' : 'Kirim Ulasan'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
