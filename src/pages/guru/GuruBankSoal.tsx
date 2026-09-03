import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, FileQuestion, FileUp, FileDown } from 'lucide-react';
import { api, type SoalDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { ImportSoalModal } from '@/components/ImportSoal';
import { downloadCsv, toCsv } from '@/lib/csv';
import { importHeaders, soalToCsvRow, type SoalLevel } from '@/lib/importSoal';
import { today } from '@/lib/utils';

const LEVEL_TONE: Record<string, string> = { mudah: 'green', sedang: 'amber', sulit: 'red' };

const EMPTY = {
  id: '', mapelId: '', level: 'sedang',
  pertanyaan: '', opsi: ['', '', '', '', ''], jawaban: 0, bobot: 10,
};

export function GuruBankSoal() {
  const { user } = useAuth();
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(() => Promise.all([api.soal(user?.id), api.mapel()]).then(([soal, mapel]) => ({ soal, mapel })), [user?.id]);

  const [q, setQ] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, opsi: ['', '', '', '', ''] as string[] });
  const [saving, setSaving] = useState(false);

  const mapelSaya = useMemo(
    () => data?.mapel.filter((m) => m.guruId === user?.id || !m.guruId) ?? [],
    [data, user?.id],
  );

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.soal.filter((s) => {
      if (filterMapel !== 'all' && s.mapelId !== filterMapel) return false;
      if (!term) return true;
      return s.pertanyaan.toLowerCase().includes(term);
    });
  }, [q, filterMapel, data]);

  const openAdd = () => { setForm({ ...EMPTY, mapelId: mapelSaya[0]?.id ?? '', opsi: ['', '', '', '', ''] }); setOpen(true); };
  const openEdit = (s: SoalDTO) => {
    const opsi = [...s.opsi];
    while (opsi.length < 5) opsi.push('');
    setForm({
      id: s.id, mapelId: s.mapelId, level: s.level, pertanyaan: s.pertanyaan,
      opsi: opsi.slice(0, 5), jawaban: s.jawaban, bobot: s.bobot,
    });
    setOpen(true);
  };

  const setOpsi = (i: number, v: string) => {
    const next = [...form.opsi];
    next[i] = v;
    setForm({ ...form, opsi: next });
  };

  const save = async () => {
    if (!form.pertanyaan.trim()) { show('Pertanyaan wajib diisi', 'error'); return; }
    if (!form.mapelId) { show('Pilih mata pelajaran', 'error'); return; }
    if (form.opsi.some((o) => !o.trim())) { show('Semua 5 opsi jawaban (A-E) wajib diisi', 'error'); return; }
    if (form.jawaban < 0 || form.jawaban > 4) { show('Pilih kunci jawaban', 'error'); return; }
    if (form.bobot <= 0) { show('Bobot harus lebih dari 0', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        mapelId: form.mapelId, level: form.level,
        pertanyaan: form.pertanyaan.trim(),
        opsi: form.opsi,
        jawaban: form.jawaban,
        bobot: form.bobot, guruId: user?.id ?? '',
      };
      if (form.id) { await api.updateSoal(form.id, payload); show('Soal diperbarui'); }
      else { await api.tambahSoal(payload); show('Soal ditambahkan'); }
      setOpen(false);
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (s: SoalDTO) => {
    const ok = await confirm('Hapus soal ini? Soal juga akan dihapus dari ujian yang memakainya.');
    if (!ok) return;
    try { await api.hapusSoal(s.id); show('Soal dihapus'); reload(); }
    catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  const exportSoal = () => {
    if (!data || data.soal.length === 0) { show('Belum ada soal untuk diekspor', 'error'); return; }
    const rows = data.soal.map((s) => soalToCsvRow({
      pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban, bobot: s.bobot,
      level: (['mudah', 'sedang', 'sulit'].includes(s.level) ? s.level : 'sedang') as SoalLevel,
    }));
    downloadCsv('bank-soal-' + today() + '.csv', toCsv(rows, importHeaders()));
    show('Bank soal diekspor ke CSV');
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Bank Soal</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kelola soal pilihan ganda A-E</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpenImport(true)} className="w-full sm:w-auto"><FileUp size={16} />Impor</Button>
          <Button variant="secondary" onClick={exportSoal} className="w-full sm:w-auto"><FileDown size={16} />Ekspor</Button>
          <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Tambah Soal</Button>
        </div>
      </div>

      <Card>
        <CardHeader title="Daftar Soal" subtitle={`${list.length} soal`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pertanyaan…" className="w-full pl-9 sm:w-52" />
              </div>
              <Select value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
                <option value="all">Semua Mapel</option>
                {mapelSaya.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </Select>
            </div>
          }
        />

        {list.length === 0 ? (
          <EmptyState icon={<FileQuestion size={40} />} title="Belum ada soal" desc="Tambahkan soal untuk digunakan dalam ujian"
            action={<Button onClick={openAdd}><Plus size={15} />Tambah Soal</Button>} />
        ) : (
          <div className="divide-y divide-slate-200">
            {list.map((s, idx) => (
              <div key={s.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">#{idx + 1}</span>
                      <Badge tone="blue">Pilihan Ganda</Badge>
                      <Badge tone={LEVEL_TONE[s.level]}>{s.level}</Badge>
                      <Badge tone="gray">{data.mapel.find((m) => m.id === s.mapelId)?.nama ?? '-'}</Badge>
                      <Badge tone="gray">Bobot {s.bobot}</Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">{s.pertanyaan}</p>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {s.opsi.map((o, i) => (
                        <li key={i} className={`rounded px-2 py-1 text-xs ${i === s.jawaban ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-500'}`}>
                          {String.fromCharCode(65 + i)}. {o}{i === s.jawaban ? ' ✓' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)} aria-label="Edit"><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(s)} className="text-rose-600 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={14} /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Soal' : 'Tambah Soal'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Tambah'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mata Pelajaran" htmlFor="q-mapel">
              <Select id="q-mapel" value={form.mapelId} onChange={(e) => setForm({ ...form, mapelId: e.target.value })}>
                <option value="">— Pilih —</option>
                {mapelSaya.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </Select>
            </Field>
            <Field label="Level" htmlFor="q-level">
              <Select id="q-level" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </Select>
            </Field>
          </div>

          <Field label="Pertanyaan" htmlFor="q-teks">
            <Textarea id="q-teks" value={form.pertanyaan} onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })} placeholder="Tulis pertanyaan di sini…" />
          </Field>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">Opsi Jawaban (A-E)</p>
            <div className="space-y-2">
              {form.opsi.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, jawaban: i })}
                    aria-label={`Jadikan opsi ${String.fromCharCode(65 + i)} kunci jawaban`}
                    className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-xs font-bold ${
                      form.jawaban === i ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-slate-500 hover:border-emerald-400'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </button>
                  <Input value={o} onChange={(e) => setOpsi(i, e.target.value)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Klik huruf untuk menandai kunci jawaban (hijau = benar)</p>
          </div>

          <Field label="Bobot Nilai" htmlFor="q-bobot">
            <Input id="q-bobot" type="number" min={1} max={100} value={form.bobot} onChange={(e) => setForm({ ...form, bobot: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>

      <ImportSoalModal
        open={openImport}
        onClose={() => setOpenImport(false)}
        onDone={reload}
        mapelList={mapelSaya}
        guruId={user?.id ?? ''}
      />

      {dialog}
    </div>
  );
}
