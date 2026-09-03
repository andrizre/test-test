import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import { api, type UserDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate, initial } from '@/lib/utils';
import type { Role } from '@/types';

const ROLE_TONE: Record<string, string> = { admin: 'purple', guru: 'blue', murid: 'green' };
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', guru: 'Guru', murid: 'Murid' };

const EMPTY = {
  username: '', password: '', name: '', role: 'murid' as Role,
  email: '', nis: '', nip: '', kelasId: '', active: true,
};

export function AdminPengguna() {
  const { user: me } = useAuth();
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(() => Promise.all([api.users(), api.kelas(), api.mapel()]).then(([users, kelas, mapel]) => ({ users, kelas, mapel })), []);

  const [q, setQ] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, id: '' });
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.users.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (!term) return true;
      return u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term)
        || (u.nis ?? '').includes(term) || (u.nip ?? '').includes(term);
    });
  }, [q, filterRole, data]);

  const openAdd = () => { setForm({ ...EMPTY, id: '' }); setOpen(true); };
  const openEdit = (u: UserDTO) => {
    setForm({
      id: u.id, username: u.username, password: u.password, name: u.name, role: u.role as Role,
      email: u.email ?? '', nis: u.nis ?? '', nip: u.nip ?? '', kelasId: u.kelasId ?? '', active: u.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.username.trim() || !form.name.trim()) { show('Username dan nama wajib diisi', 'error'); return; }
    if (!form.id && !form.password) { show('Password wajib diisi untuk user baru', 'error'); return; }
    setSaving(true);
    try {
      if (form.id) {
        await api.updateUser(form.id, form);
        show('Data pengguna diperbarui');
      } else {
        await api.tambahUser(form);
        show('Pengguna ditambahkan');
      }
      setOpen(false);
      reload();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: UserDTO) => {
    if (u.id === me?.id) { show('Tidak bisa menghapus akun sendiri', 'error'); return; }
    const ok = await confirm(`Hapus pengguna "${u.name}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!ok) return;
    try {
      await api.hapusUser(u.id);
      show('Pengguna dihapus');
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  const toggle = async (u: UserDTO) => {
    if (u.id === me?.id) { show('Tidak bisa menonaktifkan akun sendiri', 'error'); return; }
    try {
      await api.updateUser(u.id, { ...u, active: !u.active });
      show(u.active ? 'Akun dinonaktifkan' : 'Akun diaktifkan');
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal mengubah status', 'error'); }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Data Pengguna</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Kelola akun admin, guru, dan murid</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Tambah Pengguna</Button>
      </div>

      <Card>
        <CardHeader
          title="Daftar Pengguna"
          subtitle={`${list.length} dari ${data.users.length} pengguna`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama / username…" className="w-full pl-9 sm:w-56" />
              </div>
              <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">Semua Peran</option>
                <option value="admin">Admin</option>
                <option value="guru">Guru</option>
                <option value="murid">Murid</option>
              </Select>
            </div>
          }
        />

        {list.length === 0 ? (
          <EmptyState icon={<Users size={40} />} title="Pengguna tidak ditemukan" desc="Coba ubah kata kunci atau filter peran" />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nama</th>
                    <th className="px-5 py-3 font-semibold">Username</th>
                    <th className="px-5 py-3 font-semibold">Peran</th>
                    <th className="px-5 py-3 font-semibold">Kelas</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {list.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">{initial(u.name)}</div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{u.name}</p>
                            <p className="truncate text-[11px] text-slate-400">{u.email || u.nis || u.nip || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{u.username}</td>
                      <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge></td>
                      <td className="px-5 py-3 text-slate-600">{data.kelas.find((k) => k.id === u.kelasId)?.nama ?? '-'}</td>
                      <td className="px-5 py-3">
                        <button type="button" onClick={() => void toggle(u)} className="cursor-pointer">
                          <Badge tone={u.active ? 'green' : 'red'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(u)} aria-label="Edit"><Pencil size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => void remove(u)} className="text-rose-600 hover:bg-rose-50" aria-label="Hapus"><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-200 lg:hidden">
              {list.map((u) => (
                <div key={u.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">{initial(u.name)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                        <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                        <Badge tone={u.active ? 'green' : 'red'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">@{u.username}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {data.kelas.find((k) => k.id === u.kelasId)?.nama ?? '-'} · Gabung {formatDate(u.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(u)} className="flex-1"><Pencil size={13} />Edit</Button>
                    <Button size="sm" variant="secondary" onClick={() => void toggle(u)} className="flex-1">{u.active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                    <Button size="sm" variant="danger" onClick={() => void remove(u)}><Trash2 size={13} /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Pengguna' : 'Tambah Pengguna'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Tambah'}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama Lengkap" htmlFor="f-name">
            <Input id="f-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama lengkap" />
          </Field>
          <Field label="Username" htmlFor="f-user">
            <Input id="f-user" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" />
          </Field>
          <Field label="Password" htmlFor="f-pass">
            <Input id="f-pass" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="password" />
          </Field>
          <Field label="Peran" htmlFor="f-role">
            <Select id="f-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="murid">Murid</option>
            </Select>
          </Field>
          <Field label="Email" htmlFor="f-email">
            <Input id="f-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="opsional" />
          </Field>
          {form.role === 'murid' ? (
            <Field label="NIS" htmlFor="f-nis">
              <Input id="f-nis" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} placeholder="Nomor induk siswa" />
            </Field>
          ) : null}
          {form.role === 'guru' ? (
            <Field label="NIP" htmlFor="f-nip">
              <Input id="f-nip" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="Nomor induk pegawai" />
            </Field>
          ) : null}
          {form.role === 'murid' ? (
            <Field label="Kelas" htmlFor="f-kelas">
              <Select id="f-kelas" value={form.kelasId} onChange={(e) => setForm({ ...form, kelasId: e.target.value })}>
                <option value="">— Pilih Kelas —</option>
                {data.kelas.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Status" htmlFor="f-active">
            <Select id="f-active" value={String(form.active)} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
