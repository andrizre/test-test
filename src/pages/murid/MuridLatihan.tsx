import { useMemo, useState } from 'react';
import { Brain, CheckCircle2, XCircle, RotateCcw, ChevronRight, ListChecks, Trophy } from 'lucide-react';
import { api, type LatihanSoalDTO, type MapelDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { cn, shuffle } from '@/lib/utils';

interface HasilLatihan { soalId: string; pilih: number; benar: boolean; kunci: number }

const LEVEL_TONE: Record<string, string> = { mudah: 'green', sedang: 'amber', sulit: 'red' };

export function MuridLatihan() {
  const { data, loading, error } = useData(() => api.mapel(), []);
  const [mapelId, setMapelId] = useState('');
  const [fase, setFase] = useState<'pilih' | 'latihan' | 'ringkasan'>('pilih');
  const [soalList, setSoalList] = useState<LatihanSoalDTO[]>([]);
  const [idx, setIdx] = useState(0);
  const [pilih, setPilih] = useState<number | null>(null);
  const [hasil, setHasil] = useState<HasilLatihan | null>(null);
  const [riwayat, setRiwayat] = useState<HasilLatihan[]>([]);
  const [memeriksa, setMemeriksa] = useState(false);
  const [memulai, setMemulai] = useState(false);

  const mapelDipilih = useMemo(
    () => (data as MapelDTO[] | null)?.find((m) => m.id === mapelId),
    [data, mapelId],
  );

  const mulaiLatihan = async () => {
    if (!mapelId) return;
    setMemulai(true);
    try {
      const soal = await api.latihan(mapelId);
      if (soal.length === 0) return;
      setSoalList(shuffle(soal));
      setIdx(0);
      setPilih(null);
      setHasil(null);
      setRiwayat([]);
      setFase('latihan');
    } finally {
      setMemulai(false);
    }
  };

  const jawab = async (n: number) => {
    if (hasil || memeriksa) return;
    const soal = soalList[idx];
    setMemeriksa(true);
    try {
      const r = await api.latihanCek(soal.id, n);
      const h: HasilLatihan = { soalId: soal.id, pilih: n, benar: r.benar, kunci: r.jawabanBenar };
      setPilih(n);
      setHasil(h);
      setRiwayat((prev) => [...prev, h]);
    } finally {
      setMemeriksa(false);
    }
  };

  const lanjut = () => {
    if (idx >= soalList.length - 1) { setFase('ringkasan'); return; }
    setIdx((i) => i + 1);
    setPilih(null);
    setHasil(null);
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={() => undefined} /></Card>;

  const benarCount = riwayat.filter((r) => r.benar).length;
  const akurasi = riwayat.length > 0 ? Math.round((benarCount / riwayat.length) * 100) : 0;

  if (fase === 'pilih') {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <Card className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Brain size={22} /></div>
          <h1 className="text-base font-bold text-slate-800">Latihan Soal</h1>
          <p className="mt-1 text-xs text-slate-500">Berlatih tanpa nilai — langsung lihat pembahasan setelah menjawab. Tidak memengaruhi nilai ujian.</p>
          <Field label="Mata Pelajaran" htmlFor="lt-mapel">
            <Select id="lt-mapel" value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">— Pilih Mapel —</option>
              {data.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </Select>
          </Field>
          <Button className="mt-4 w-full" disabled={!mapelId || memulai} onClick={() => void mulaiLatihan()}>
            {memulai ? 'Menyiapkan…' : 'Mulai Latihan'}
          </Button>
        </Card>
      </div>
    );
  }

  if (fase === 'ringkasan') {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-6 text-center">
          <div className={cn('mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full',
            akurasi >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600')}>
            <Trophy size={28} />
          </div>
          <h1 className="text-base font-bold text-slate-800">Latihan Selesai!</h1>
          <p className="mt-1 text-xs text-slate-500">{mapelDipilih?.nama}</p>
          <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-2xl font-black text-emerald-600">{benarCount}/{riwayat.length}</p>
              <p className="text-[11px] text-slate-500">Jawaban Benar</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-2xl font-black text-brand-600">{akurasi}%</p>
              <p className="text-[11px] text-slate-500">Akurasi</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => void mulaiLatihan()}><RotateCcw size={15} />Ulangi Latihan</Button>
            <Button variant="secondary" onClick={() => { setFase('pilih'); setSoalList([]); }}>
              <ListChecks size={15} />Ganti Mapel
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Rincian Jawaban" subtitle="Periksa soal yang keliru untuk dipelajari lagi" />
          <div className="divide-y divide-slate-100">
            {soalList.map((s, i) => {
              const h = riwayat.find((r) => r.soalId === s.id);
              const benar = h?.benar ?? false;
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-start gap-2">
                    {benar
                      ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                      : <XCircle size={15} className="mt-0.5 shrink-0 text-rose-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700"><span className="font-medium">{i + 1}. </span>{s.pertanyaan}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Jawabanmu: <span className={benar ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                          {h ? `${String.fromCharCode(65 + h.pilih)}. ${s.opsi[h.pilih]}` : '-'}
                        </span>
                        {!benar && h ? ` · Kunci: ${String.fromCharCode(65 + h.kunci)}. ${s.opsi[h.kunci]}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    );
  }

  const soal = soalList[idx];
  if (!soal) return <Card><EmptyState title="Soal tidak tersedia" /></Card>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="sticky top-14 z-10 lg:top-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-800">{mapelDipilih?.nama ?? 'Latihan'}</h1>
            <p className="mt-0.5 text-[11px] text-slate-500">Soal {idx + 1} dari {soalList.length} · Benar {benarCount}</p>
          </div>
          <Badge tone={LEVEL_TONE[soal.level] ?? 'gray'}>{soal.level}</Badge>
        </div>
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full bg-brand-500 transition-all" style={{ width: ((idx + 1) / soalList.length) * 100 + '%' }} />
        </div>
      </Card>

      <Card>
        <div className="p-4 sm:p-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{soal.pertanyaan}</p>
          <div className="mt-4 space-y-2">
            {soal.opsi.map((o, i) => {
              const dipilih = pilih === i;
              const kunci = hasil?.kunci === i;
              const tampilHasil = !!hasil;
              return (
                <button key={i} type="button" disabled={tampilHasil || memeriksa} onClick={() => void jawab(i)}
                  className={cn('flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    !tampilHasil && !memeriksa && 'cursor-pointer hover:border-slate-300 hover:bg-slate-50',
                    tampilHasil && kunci && 'border-emerald-500 bg-emerald-50',
                    tampilHasil && dipilih && !kunci && 'border-rose-500 bg-rose-50',
                    tampilHasil && !dipilih && !kunci && 'border-slate-200 opacity-60',
                    !tampilHasil && (dipilih ? 'border-brand-500 bg-brand-50' : 'border-slate-200'))}>
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    tampilHasil && kunci ? 'border-emerald-600 bg-emerald-600 text-white'
                      : tampilHasil && dipilih ? 'border-rose-600 bg-rose-600 text-white'
                        : dipilih ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-500')}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-sm text-slate-700">{o}</span>
                  {tampilHasil && kunci ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : null}
                  {tampilHasil && dipilih && !kunci ? <XCircle size={16} className="shrink-0 text-rose-600" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        {hasil ? (
          <div className="border-t border-slate-200 p-4">
            <div className={cn('flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs',
              hasil.benar ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
              {hasil.benar ? <CheckCircle2 size={15} className="mt-px shrink-0" /> : <XCircle size={15} className="mt-px shrink-0" />}
              <span>
                {hasil.benar
                  ? 'Benar! Bagus, pertahankan.'
                  : `Kurang tepat. Kunci jawabannya ${String.fromCharCode(65 + hasil.kunci)}. ${soal.opsi[hasil.kunci]}`}
              </span>
            </div>
            <Button className="mt-3 w-full" onClick={lanjut}>
              {idx >= soalList.length - 1 ? 'Lihat Ringkasan' : 'Soal Berikutnya'}<ChevronRight size={15} />
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
