import { useState } from 'react';
import { Plus, School, Pencil, Trash2, Users } from 'lucide-react';
import { api, type KelasDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Button, Card, EmptyState, Field, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';

const EMPTY = { id: '', nama: '', tingkat: 'X', jurusan: 'IPA', waliId: '' };

export function AdminKelas() {
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(() => Promise.all([api.kelas(), api.users()]).then(([kelas, users]) => ({ kelas, users })), []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const jmlMurid = (id: string) => data?.users.filter((u) => u.role === 'murid' && u.kelasId === id).length ?? 0;

  const openAdd = () => { setForm({ ...EMPTY }); setOpen(true); };
  const openEdit = (k: KelasDTO) => { setForm({ id: k.id, nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan, waliId: k.waliId ?? '' }); setOpen(true); };

  const save = async () => {
    if (!form.nama.trim()) { show('Nama kelas wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      if (form.id) { await api.updateKelas(form.id, form); show('Kelas diperbarui'); }
      else { await api.tambahKelas(form); show('Kelas ditambahkan'); }
      setOpen(false);
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (k: KelasDTO) => {
    const n = jmlMurid(k.id);
    const ok = await confirm(`Hapus kelas "${k.nama}"?${n > 0 ? ` ${n} siswa akan kehilangan kelasnya.` : ''}`);
    if (!ok) return;
    try { await api.hapusKelas(k.id); show('Kelas dihapus'); reload(); }
    catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  const guruList = data.users.filter((u) => u.role === 'guru');

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Data Kelas</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kelola kelas dan wali kelas</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Tambah Kelas</Button>
      </div>

      {data.kelas.length === 0 ? (
        <Card>
          <EmptyState icon={<School size={40} />} title="Belum ada kelas" desc="Tambahkan kelas pertama Anda"
            action={<Button onClick={openAdd}><Plus size={15} />Tambah Kelas</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.kelas.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-800">{k.nama}</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Tingkat {k.tingkat} · {k.jurusan}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(k)} aria-label="Edit"><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(k)} className="text-rose-600 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={14} /></Button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500"><Users size={13} />{jmlMurid(k.id)} siswa</span>
                <span className="truncate text-[11px] text-slate-500">Wali: {data.users.find((u) => u.id === k.waliId)?.name ?? '—'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Kelas' : 'Tambah Kelas'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Tambah'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Kelas" htmlFor="k-nama">
            <Input id="k-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="X IPA 1" />
          </Field>
          <Field label="Tingkat" htmlFor="k-tingkat">
            <Select id="k-tingkat" value={form.tingkat} onChange={(e) => setForm({ ...form, tingkat: e.target.value })}>
              <option value="X">X</option><option value="XI">XI</option><option value="XII">XII</option>
            </Select>
          </Field>
          <Field label="Jurusan" htmlFor="k-jurusan">
            <Input id="k-jurusan" value={form.jurusan} onChange={(e) => setForm({ ...form, jurusan: e.target.value })} placeholder="IPA / IPS" />
          </Field>
          <Field label="Wali Kelas" htmlFor="k-wali">
            <Select id="k-wali" value={form.waliId} onChange={(e) => setForm({ ...form, waliId: e.target.value })}>
              <option value="">— Tidak ada —</option>
              {guruList.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
