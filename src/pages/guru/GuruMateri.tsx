import { useMemo, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api, type MateriDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDateTime } from '@/lib/utils';

const EMPTY = { id: '', mapelId: '', judul: '', isi: '' };

export function GuruMateri() {
  const { user } = useAuth();
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(
    () => Promise.all([api.materi(), api.mapel()]).then(([materi, mapel]) => ({ materi, mapel })),
    [],
  );

  const [q, setQ] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const mapelSaya = useMemo(
    () => data?.mapel.filter((m) => m.guruId === user?.id || !m.guruId) ?? [],
    [data, user?.id],
  );

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.materi.filter((m) => {
      if (filterMapel !== 'all' && m.mapelId !== filterMapel) return false;
      if (!term) return true;
      return m.judul.toLowerCase().includes(term) || m.isi.toLowerCase().includes(term);
    });
  }, [q, filterMapel, data]);

  const openAdd = () => { setForm({ ...EMPTY, mapelId: mapelSaya[0]?.id ?? '' }); setOpen(true); };
  const openEdit = (m: MateriDTO) => { setForm({ id: m.id, mapelId: m.mapelId, judul: m.judul, isi: m.isi }); setOpen(true); };

  const save = async () => {
    if (!form.judul.trim()) { show('Judul materi wajib diisi', 'error'); return; }
    if (!form.mapelId) { show('Pilih mata pelajaran', 'error'); return; }
    if (!form.isi.trim()) { show('Isi materi wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const payload = { mapelId: form.mapelId, judul: form.judul.trim(), isi: form.isi, guruId: user?.id ?? '' };
      if (form.id) { await api.updateMateri(form.id, payload); show('Materi diperbarui'); }
      else { await api.tambahMateri(payload); show('Materi ditambahkan'); }
      setOpen(false);
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (m: MateriDTO) => {
    const ok = await confirm(`Hapus materi "${m.judul}"?`);
    if (!ok) return;
    try { await api.hapusMateri(m.id); show('Materi dihapus'); reload(); }
    catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Materi</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kelola materi belajar untuk dibaca siswa</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Tambah Materi</Button>
      </div>

      <Card>
        <CardHeader title="Daftar Materi" subtitle={`${list.length} materi`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari materi…" className="w-full pl-9 sm:w-52" />
              </div>
              <Select value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
                <option value="all">Semua Mapel</option>
                {data.mapel.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </Select>
            </div>
          }
        />
        {list.length === 0 ? (
          <EmptyState icon={<BookOpen size={40} />} title="Belum ada materi" desc="Tambahkan materi agar siswa bisa membacanya sebelum ujian"
            action={<Button onClick={openAdd}><Plus size={15} />Tambah Materi</Button>} />
        ) : (
          <div className="divide-y divide-slate-200">
            {list.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="blue">{data.mapel.find((x) => x.id === m.mapelId)?.nama ?? '-'}</Badge>
                      <span className="text-[11px] text-slate-400">{formatDateTime(m.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{m.judul}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{m.isi}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)} aria-label="Edit"><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(m)} className="text-rose-600 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={14} /></Button>
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
        title={form.id ? 'Edit Materi' : 'Tambah Materi'}
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
            <Field label="Mata Pelajaran" htmlFor="mt-mapel">
              <Select id="mt-mapel" value={form.mapelId} onChange={(e) => setForm({ ...form, mapelId: e.target.value })}>
                <option value="">— Pilih —</option>
                {mapelSaya.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </Select>
            </Field>
            <Field label="Judul Materi" htmlFor="mt-judul">
              <Input id="mt-judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="cth: Fungsi Kuadrat" />
            </Field>
          </div>
          <Field label="Isi Materi" htmlFor="mt-isi">
            <Textarea id="mt-isi" value={form.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })}
              placeholder="Tulis materi di sini… (boleh multi-baris)" className="min-h-52" />
          </Field>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
