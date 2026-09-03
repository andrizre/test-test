import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { api, type PelanggaranDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Button, Card } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { cn, shuffle, statusUjian } from '@/lib/utils';

export function MuridKerjakanUjian() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useData(async () => {
    if (!id || !user) return null;
    const [ujian, attempts, allSoal, mapel] = await Promise.all([
      api.ujianById(id), api.attemptsSaya(user.id), api.soal(), api.mapel(),
    ]);
    return { ujian, attempts, allSoal, mapel };
  }, [id, user?.id]);

  const ujian = data?.ujian;
  const selesaiAttempt = data?.attempts.find((a) => a.ujianId === id && a.status === 'selesai');
  const draft = data?.attempts.find((a) => a.ujianId === id && a.status === 'mengerjakan');

  const soalList = useMemo(() => {
    if (!ujian || !data) return [];
    const picked = ujian.soalIds
      .map((sid) => data.allSoal.find((s) => s.id === sid))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    return ujian.acakSoal ? shuffle(picked) : picked;
  }, [ujian, data]);

  const [jawaban, setJawaban] = useState<Record<string, number>>({});
  const [ragu, setRagu] = useState<string[]>([]);
  const [pelanggaran, setPelanggaran] = useState(0);
  const [pelanggaranDetail, setPelanggaranDetail] = useState<PelanggaranDTO[]>([]);
  const [idx, setIdx] = useState(0);
  const [mulai, setMulai] = useState('');
  const [sisa, setSisa] = useState(0);
  const [done, setDone] = useState(false);
  const [konfirm, setKonfirm] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [terbuka, setTerbuka] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const savedRef = useRef<string>('');
  const submittedRef = useRef(false);
  const pelanggaranRef = useRef({ count: 0, detail: [] as PelanggaranDTO[], last: 0 });

  // Ambil draft yang tersimpan di server
  useEffect(() => {
    if (!draft || terbuka) return;
    setJawaban(draft.jawaban ?? {});
    setRagu(draft.ragu ?? []);
    setPelanggaran(draft.pelanggaran ?? 0);
    setPelanggaranDetail(draft.pelanggaranDetail ?? []);
    pelanggaranRef.current = { count: draft.pelanggaran ?? 0, detail: draft.pelanggaranDetail ?? [], last: 0 };
    setMulai(draft.mulai);
    const elapsed = Math.floor((Date.now() - new Date(draft.mulai).getTime()) / 1000);
    setSisa(Math.max(0, (ujian?.durasi ?? 0) * 60 - elapsed));
    setTerbuka(true);
  }, [draft, terbuka, ujian?.durasi]);

  // Anti-cheat: deteksi keluar tab / minimize saat ujian berlangsung
  useEffect(() => {
    if (!terbuka || done) return;
    const onVisibility = () => {
      if (!document.hidden) return;
      const ref = pelanggaranRef.current;
      const t = Date.now();
      if (t - ref.last < 1000) return;
      ref.last = t;
      ref.count += 1;
      const entry: PelanggaranDTO = { waktu: new Date(t).toISOString(), jenis: 'pindah-tab' };
      ref.detail = [...ref.detail, entry];
      setPelanggaran(ref.count);
      setPelanggaranDetail(ref.detail);
      show(`Kamu keluar dari halaman ujian! Pelanggaran ke-${ref.count} tercatat oleh sistem.`, 'error');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terbuka, done]);

  // Simpan progres ke server (debounce 3 detik)
  useEffect(() => {
    if (!terbuka || done || !ujian || !user || !mulai) return;
    const snapshot = JSON.stringify({ jawaban, ragu, pelanggaran, pelanggaranDetail });
    if (snapshot === savedRef.current) return;

    const t = setTimeout(() => {
      savedRef.current = snapshot;
      const payload = {
        ujianId: ujian.id, muridId: user.id, jawaban, ragu, mulai, status: 'mengerjakan',
        pelanggaran, pelanggaranDetail,
      };
      const target = draft?.id;
      if (target) api.updateAttempt(target, payload).catch(() => {});
      else api.updateAttempt('__baru__', payload).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [jawaban, ragu, pelanggaran, pelanggaranDetail, terbuka, done, ujian, user, mulai, draft?.id]);

  // Timer
  useEffect(() => {
    if (!terbuka || done) return;
    const t = setInterval(() => {
      setSisa((s) => {
        if (s <= 1) {
          clearInterval(t);
          if (!submittedRef.current) { submittedRef.current = true; void finalSubmit(true); }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terbuka, done]);

  const finalSubmit = async (auto = false) => {
    if (!ujian || !user) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      await api.submitAttempt({
        ujianId: ujian.id, muridId: user.id, jawaban, ragu, mulai: mulai || new Date().toISOString(),
        pelanggaran: pelanggaranRef.current.count, pelanggaranDetail: pelanggaranRef.current.detail,
      });
      setDone(true);
      setKonfirm(false);
      show(auto ? 'Waktu habis — jawaban dikirim otomatis' : 'Jawaban berhasil dikirim', auto ? 'info' : 'success');
      setTimeout(() => navigate(`/murid/ujian/${ujian.id}/selesai`), 1200);
    } catch (e) {
      submittedRef.current = false;
      show(e instanceof Error ? e.message : 'Gagal mengirim jawaban', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;
  if (!ujian || !user) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-600">Ujian tidak ditemukan.</p>
        <Link to="/murid/ujian" className="mt-3 inline-block"><Button size="sm" variant="secondary">Kembali</Button></Link>
      </Card>
    );
  }

  if (selesaiAttempt) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-slate-800">Kamu sudah menyelesaikan ujian ini.</p>
        <p className="mt-1 text-xs text-slate-500">Lihat hasilnya di menu Hasil &amp; Nilai.</p>
        <Link to="/murid/hasil" className="mt-4 inline-block"><Button size="sm">Lihat Hasil</Button></Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm font-medium text-slate-800">Jawaban terkirim.</p>
        <p className="mt-1 text-xs text-slate-500">Mengalihkan ke halaman hasil…</p>
      </Card>
    );
  }

  const st = statusUjian(ujian);

  if (!terbuka) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Lock size={22} /></div>
          <h1 className="text-base font-bold text-slate-800">{ujian.judul}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {data.mapel.find((m) => m.id === ujian.mapelId)?.nama} · {ujian.durasi} menit · {ujian.soalIds.length} soal · Pilihan Ganda A-E
          </p>

          {st !== 'berlangsung' ? (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
              <AlertTriangle size={15} className="mt-px shrink-0" />
              <span>{st === 'akan-datang' ? 'Ujian belum dimulai. Kembali pada jadwal yang ditentukan.' : 'Ujian sudah ditutup.'}</span>
            </div>
          ) : null}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <ShieldAlert size={15} className="mt-px shrink-0" />
            <span>Dilarang keluar dari halaman/tab ujian selama mengerjakan. Setiap pelanggaran akan tercatat dan terlihat oleh pengawas.</span>
          </div>

          <div className="mt-5">
            <label htmlFor="token" className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 uppercase">Token Ujian</label>
            <input
              id="token" value={tokenInput} onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="Masukkan token"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm tracking-widest focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </div>

          <Button
            className="mt-4 w-full" disabled={st !== 'berlangsung'}
            onClick={() => {
              if (tokenInput !== ujian.token) { show('Token salah', 'error'); return; }
              const m = new Date().toISOString();
              setMulai(m);
              setSisa(ujian.durasi * 60);
              setTerbuka(true);
            }}
          >
            Mulai Ujian
          </Button>
        </Card>
        <Link to="/murid/ujian" className="block">
          <Button variant="ghost" className="w-full"><ChevronLeft size={15} />Kembali</Button>
        </Link>
      </div>
    );
  }

  const soal = soalList[idx];
  const total = soalList.length;
  const terjawab = Object.keys(jawaban).filter((k) => jawaban[k] !== undefined).length;

  const jam = Math.floor(sisa / 3600);
  const menit = Math.floor((sisa % 3600) / 60);
  const detik = sisa % 60;
  const waktu = (jam > 0 ? String(jam).padStart(2, '0') + ':' : '') + String(menit).padStart(2, '0') + ':' + String(detik).padStart(2, '0');

  const setJawab = (sid: string, val: number) => setJawaban((p) => ({ ...p, [sid]: val }));
  const toggleRagu = (sid: string) => setRagu((p) => (p.includes(sid) ? p.filter((x) => x !== sid) : [...p, sid]));

  if (!soal) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-slate-600">Soal belum tersedia.</p>
        <Link to="/murid/ujian" className="mt-3 inline-block"><Button size="sm" variant="secondary">Kembali</Button></Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="sticky top-14 z-10 lg:top-0">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">{ujian.judul}</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Soal {idx + 1} dari {total} · {terjawab} terjawab</p>
          </div>
          <div className="flex items-center gap-3">
            {pelanggaran > 0 ? (
              <span className="flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-700">
                <ShieldAlert size={14} />{pelanggaran}x
              </span>
            ) : null}
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${
              sisa <= 60 ? 'bg-rose-100 text-rose-700' : sisa <= 300 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
            }`}>
              <Clock size={15} /><span className="tabular-nums">{waktu}</span>
            </div>
            <Button size="sm" variant="success" onClick={() => setKonfirm(true)} disabled={submitting}>
              <Send size={14} /><span className="hidden sm:inline">Kumpulkan</span>
            </Button>
          </div>
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full bg-brand-500 transition-all" style={{ width: ((idx + 1) / total) * 100 + '%' }} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <Card>
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-600 px-2 py-1 text-[11px] font-bold text-white">Soal {idx + 1}</span>
              <span className="text-[11px] text-slate-500">Pilihan Ganda</span>
              <span className="text-[11px] text-slate-400">Bobot {soal.bobot}</span>
              <Button size="sm" variant="ghost" onClick={() => toggleRagu(soal.id)}
                className={cn('ml-auto', ragu.includes(soal.id) && 'bg-amber-100 text-amber-700')}>
                <Flag size={13} />{ragu.includes(soal.id) ? 'Ragu' : 'Tandai'}
              </Button>
            </div>

            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{soal.pertanyaan}</p>

            <div className="mt-4 space-y-2">
              {soal.opsi.map((o, i) => {
                const on = jawaban[soal.id] === i;
                return (
                  <button key={i} type="button" onClick={() => setJawab(soal.id, i)}
                    className={cn('flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      on ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                      on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-500')}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm text-slate-700">{o}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-4">
            <Button size="sm" variant="secondary" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
              <ChevronLeft size={14} />Sebelumnya
            </Button>
            <Button size="sm" disabled={idx === total - 1} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
              Selanjutnya<ChevronRight size={14} />
            </Button>
          </div>
        </Card>

        <Card className="h-fit">
          <div className="border-b border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-700">Navigasi Soal</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{terjawab}/{total} terjawab</p>
          </div>
          <div className="grid grid-cols-6 gap-1.5 p-3 lg:grid-cols-5">
            {soalList.map((s, i) => {
              const answered = jawaban[s.id] !== undefined;
              const isRagu = ragu.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => setIdx(i)}
                  className={cn('flex aspect-square cursor-pointer items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                    i === idx && 'ring-2 ring-brand-400 ring-offset-1',
                    answered && !isRagu && 'border-brand-500 bg-brand-500 text-white',
                    answered && isRagu && 'border-amber-500 bg-amber-500 text-white',
                    !answered && isRagu && 'border-amber-300 bg-amber-50 text-amber-700',
                    !answered && !isRagu && 'border-slate-300 text-slate-500 hover:bg-slate-50')}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5 border-t border-slate-200 p-3 text-[11px] text-slate-500">
            <p className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-brand-500" />Terjawab</p>
            <p className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-500" />Ragu-ragu</p>
            <p className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-slate-300" />Belum dijawab</p>
          </div>
        </Card>
      </div>

      <Modal
        open={konfirm}
        onClose={() => setKonfirm(false)}
        title="Kumpulkan Jawaban"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setKonfirm(false)}>Periksa Lagi</Button>
            <Button variant="success" onClick={() => void finalSubmit(false)} disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Ya, Kumpulkan'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">Kamu sudah menjawab <strong>{terjawab}</strong> dari <strong>{total}</strong> soal.</p>
        {terjawab < total ? (
          <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={14} className="mt-px shrink-0" />
            Masih ada {total - terjawab} soal yang belum dijawab.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
