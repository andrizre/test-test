import { useState } from 'react';
import { Plus, BookOpen, Pencil, Trash2, FileQuestion } from 'lucide-react';
import { api, type MapelDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Button, Card, CardHeader, EmptyState, Field, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';

const EMPTY = { id: '', kode: '', nama: '', guruId: '' };

export function AdminMapel() {
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(() => Promise.all([api.mapel(), api.users(), api.soal(), api.ujian()]).then(([mapel, users, soal, ujian]) => ({ mapel, users, soal, ujian })), []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const jmlSoal = (id: string) => data?.soal.filter((s) => s.mapelId === id).length ?? 0;
  const jmlUjian = (id: string) => data?.ujian.filter((u) => u.mapelId === id).length ?? 0;

  const openAdd = () => { setForm({ ...EMPTY }); setOpen(true); };
  const openEdit = (m: MapelDTO) => { setForm({ id: m.id, kode: m.kode, nama: m.nama, guruId: m.guruId ?? '' }); setOpen(true); };

  const save = async () => {
    if (!form.nama.trim() || !form.kode.trim()) { show('Kode dan nama mapel wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      if (form.id) { await api.updateMapel(form.id, form); show('Mata pelajaran diperbarui'); }
      else { await api.tambahMapel(form); show('Mata pelajaran ditambahkan'); }
      setOpen(false);
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (m: MapelDTO) => {
    const ok = await confirm(`Hapus mata pelajaran "${m.nama}"?`);
    if (!ok) return;
    try { await api.hapusMapel(m.id); show('Mata pelajaran dihapus'); reload(); }
    catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  const guruList = data.users.filter((u) => u.role === 'guru');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Mata Pelajaran</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kelola mata pelajaran dan guru pengampu</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Tambah Mapel</Button>
      </div>

      <Card>
        <CardHeader title="Daftar Mata Pelajaran" subtitle={`${data.mapel.length} mata pelajaran`} />
        {data.mapel.length === 0 ? (
          <EmptyState icon={<BookOpen size={40} />} title="Belum ada mata pelajaran"
            action={<Button onClick={openAdd}><Plus size={15} />Tambah Mapel</Button>} />
        ) : (
          <div className="divide-y divide-slate-200">
            {data.mapel.map((m) => (
              <div key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-700">{m.kode}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{m.nama}</p>
                    <p className="truncate text-[11px] text-slate-500">Pengampu: {data.users.find((u) => u.id === m.guruId)?.name ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="flex gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><FileQuestion size={12} />{jmlSoal(m.id)} soal</span>
                    <span>{jmlUjian(m.id)} ujian</span>
                  </div>
                  <div className="flex gap-1">
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
        title={form.id ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Tambah'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode" htmlFor="m-kode">
            <Input id="m-kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value.toUpperCase() })} placeholder="MTK" maxLength={5} />
          </Field>
          <Field label="Nama Mata Pelajaran" htmlFor="m-nama">
            <Input id="m-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Matematika" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Guru Pengampu" htmlFor="m-guru">
              <Select id="m-guru" value={form.guruId} onChange={(e) => setForm({ ...form, guruId: e.target.value })}>
                <option value="">— Tidak ada —</option>
                {guruList.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
