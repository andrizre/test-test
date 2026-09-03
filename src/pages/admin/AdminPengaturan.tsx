import { useState } from 'react';
import { Save, RotateCcw, Database, Info } from 'lucide-react';
import { api, type PengaturanDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Button, Card, CardHeader, Field, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';

export function AdminPengaturan() {
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { gantiPassword } = useAuth();
  const { data, loading, error, reload } = useData(() => api.meta(), []);

  const [form, setForm] = useState<PengaturanDTO | null>(null);
  const [pass, setPass] = useState({ lama: '', baru: '', ulang: '' });
  const [saving, setSaving] = useState(false);

  const current = form ?? data?.pengaturan ?? null;

  const simpan = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await api.simpanPengaturan(current);
      show('Pengaturan disimpan');
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const ubahPassword = async () => {
    if (!pass.lama || !pass.baru) { show('Semua field password wajib diisi', 'error'); return; }
    if (pass.baru.length < 5) { show('Password baru minimal 5 karakter', 'error'); return; }
    if (pass.baru !== pass.ulang) { show('Konfirmasi password tidak cocok', 'error'); return; }
    const res = await gantiPassword(pass.lama, pass.baru);
    if (!res.ok) { show(res.error ?? 'Gagal mengubah password', 'error'); return; }
    setPass({ lama: '', baru: '', ulang: '' });
    show('Password berhasil diubah');
  };

  const reset = async () => {
    const ok = await confirm('Reset semua data ke kondisi awal? Semua perubahan akan hilang.');
    if (!ok) return;
    try {
      await api.reset();
      show('Data berhasil direset');
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal reset', 'error'); }
  };

  if (loading) return <Card><Loading /></Card>;
  if (error || !current) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Pengaturan</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Profil sekolah, keamanan akun, dan data aplikasi</p>
      </div>

      <Card>
        <CardHeader title="Profil Sekolah" subtitle="Informasi yang tampil di aplikasi" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <Field label="Nama Sekolah" htmlFor="s-nama">
              <Input id="s-nama" value={current.namaSekolah} onChange={(e) => setForm({ ...current, namaSekolah: e.target.value })} />
            </Field>
          </div>
          <Field label="Tahun Ajaran" htmlFor="s-ta">
            <Input id="s-ta" value={current.tahunAjaran} onChange={(e) => setForm({ ...current, tahunAjaran: e.target.value })} placeholder="2024/2025" />
          </Field>
          <Field label="Semester" htmlFor="s-sem">
            <Select id="s-sem" value={current.semester} onChange={(e) => setForm({ ...current, semester: e.target.value })}>
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </Select>
          </Field>
          <Field label="Kepala Sekolah" htmlFor="s-kepsek">
            <Input id="s-kepsek" value={current.kepalaSekolah} onChange={(e) => setForm({ ...current, kepalaSekolah: e.target.value })} />
          </Field>
          <Field label="Alamat" htmlFor="s-alamat">
            <Input id="s-alamat" value={current.alamat} onChange={(e) => setForm({ ...current, alamat: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
          <Button onClick={() => void simpan()} disabled={saving}><Save size={15} />{saving ? 'Menyimpan…' : 'Simpan Pengaturan'}</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Ubah Password" subtitle="Ganti password akun admin Anda" />
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <Field label="Password Lama" htmlFor="p-lama">
            <Input id="p-lama" type="password" value={pass.lama} onChange={(e) => setPass({ ...pass, lama: e.target.value })} />
          </Field>
          <Field label="Password Baru" htmlFor="p-baru">
            <Input id="p-baru" type="password" value={pass.baru} onChange={(e) => setPass({ ...pass, baru: e.target.value })} />
          </Field>
          <Field label="Ulangi Password Baru" htmlFor="p-ulang">
            <Input id="p-ulang" type="password" value={pass.ulang} onChange={(e) => setPass({ ...pass, ulang: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
          <Button variant="secondary" onClick={() => void ubahPassword()}>Ubah Password</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Data Aplikasi" subtitle="Kelola database aplikasi" />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-start sm:gap-4">
            <Info size={18} className="mt-0.5 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-600">
              Seluruh data (pengguna, soal, ujian, dan nilai) disimpan di database
              <strong> SQLite</strong> pada server. Gunakan tombol reset untuk mengembalikan
              data ke kondisi awal (data contoh).
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="danger" onClick={() => void reset()}><RotateCcw size={15} />Reset Data</Button>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Database size={12} />UjianOnline v1.0.0 · SQLite</p>
        </div>
      </Card>

      {dialog}
    </div>
  );
}
