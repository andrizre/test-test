import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ClipboardList, Users, Eye, EyeOff } from 'lucide-react';
import { api, type UjianDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { Modal } from '@/components/Modal';
import { Badge, Button, Card, EmptyState, Field, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate, statusUjian, today } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  berlangsung: 'Berlangsung', 'akan-datang': 'Akan Datang', selesai: 'Selesai', draft: 'Draft',
};

const EMPTY = {
  id: '', judul: '', mapelId: '', durasi: 60, tanggal: today(), jamMulai: '08:00', jamSelesai: '09:00',
  status: 'draft', token: '', acakSoal: false, tampilkanNilai: true, kkm: 75,
};

export function GuruUjian() {
  const { user } = useAuth();
  const { show } = useToast();
  const { confirm, dialog } = useConfirm();
  const { data, loading, error, reload } = useData(async () => {
    const [ujian, soal, mapel, kelas] = await Promise.all([
      api.ujian(user?.id), api.soal(user?.id), api.mapel(), api.kelas(),
    ]);
    const att = await Promise.all(ujian.map((u) => api.attempts({ ujianId: u.id })));
    return { ujian, soal, mapel, kelas, attempts: att.flat() };
  }, [user?.id]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, kelasIds: [] as string[], soalIds: [] as string[] });
  const [saving, setSaving] = useState(false);

  const mapelSaya = useMemo(() => data?.mapel.filter((m) => m.guruId === user?.id) ?? [], [data, user?.id]);

  const soalTersedia = useMemo(
    () => (data?.soal ?? []).filter((s) => (form.mapelId ? s.mapelId === form.mapelId : true)),
    [data, form.mapelId],
  );

  const openAdd = () => {
    setForm({
      ...EMPTY, mapelId: mapelSaya[0]?.id ?? '',
      token: Math.random().toString(36).slice(2, 7).toUpperCase(),
      kelasIds: [], soalIds: [],
    });
    setOpen(true);
  };

  const openEdit = (u: UjianDTO) => {
    setForm({
      id: u.id, judul: u.judul, mapelId: u.mapelId, kelasIds: [...u.kelasIds], soalIds: [...u.soalIds],
      durasi: u.durasi, tanggal: u.tanggal, jamMulai: u.jamMulai, jamSelesai: u.jamSelesai,
      status: u.status, token: u.token, acakSoal: u.acakSoal, tampilkanNilai: u.tampilkanNilai, kkm: u.kkm,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.judul.trim()) { show('Judul ujian wajib diisi', 'error'); return; }
    if (!form.mapelId) { show('Pilih mata pelajaran', 'error'); return; }
    if (form.soalIds.length === 0) { show('Pilih minimal 1 soal', 'error'); return; }
    if (form.kelasIds.length === 0) { show('Pilih minimal 1 kelas', 'error'); return; }
    if (form.durasi <= 0) { show('Durasi harus lebih dari 0', 'error'); return; }

    setSaving(true);
    try {
      const payload = { ...form, guruId: user?.id ?? '' };
      if (form.id) { await api.updateUjian(form.id, payload); show('Ujian diperbarui'); }
      else { await api.tambahUjian(payload); show('Ujian dibuat'); }
      setOpen(false);
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal menyimpan', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (u: UjianDTO) => {
    const n = data?.attempts.filter((a) => a.ujianId === u.id).length ?? 0;
    const ok = await confirm(`Hapus ujian "${u.judul}"?${n > 0 ? ` ${n} data pengerjaan akan ikut terhapus.` : ''}`);
    if (!ok) return;
    try { await api.hapusUjian(u.id); show('Ujian dihapus'); reload(); }
    catch (e) { show(e instanceof Error ? e.message : 'Gagal menghapus', 'error'); }
  };

  const toggleStatus = async (u: UjianDTO) => {
    const next = u.status === 'publish' ? 'draft' : 'publish';
    try {
      await api.updateUjian(u.id, { status: next });
      show(next === 'publish' ? 'Ujian dipublikasikan' : 'Ujian dijadikan draft');
      reload();
    } catch (e) { show(e instanceof Error ? e.message : 'Gagal mengubah status', 'error'); }
  };

  const toggleSoal = (id: string) =>
    setForm((f) => ({ ...f, soalIds: f.soalIds.includes(id) ? f.soalIds.filter((x) => x !== id) : [...f.soalIds, id] }));

  const toggleKelas = (id: string) =>
    setForm((f) => ({ ...f, kelasIds: f.kelasIds.includes(id) ? f.kelasIds.filter((x) => x !== id) : [...f.kelasIds, id] }));

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Ujian</h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Buat dan kelola ujian untuk kelas Anda</p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto"><Plus size={16} />Buat Ujian</Button>
      </div>

      {data.ujian.length === 0 ? (
        <Card>
          <EmptyState icon={<ClipboardList size={40} />} title="Belum ada ujian" desc="Buat ujian dari soal yang sudah Anda tambahkan"
            action={<Button onClick={openAdd}><Plus size={15} />Buat Ujian</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.ujian.map((u) => {
            const st = statusUjian(u);
            const peserta = data.attempts.filter((a) => a.ujianId === u.id).length;
            const selesai = data.attempts.filter((a) => a.ujianId === u.id && a.status === 'selesai').length;
            return (
              <Card key={u.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{u.judul}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {data.mapel.find((m) => m.id === u.mapelId)?.nama ?? '-'} · {u.durasi} menit
                    </p>
                  </div>
                  <Badge tone={st === 'berlangsung' ? 'green' : st === 'akan-datang' ? 'blue' : st === 'selesai' ? 'gray' : 'amber'}>
                    {STATUS_LABEL[st]}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <p>Tanggal: <span className="text-slate-700">{formatDate(u.tanggal)}</span></p>
                  <p>Waktu: <span className="text-slate-700">{u.jamMulai}–{u.jamSelesai}</span></p>
                  <p>Soal: <span className="text-slate-700">{u.soalIds.length}</span></p>
                  <p>Peserta: <span className="text-slate-700">{selesai}/{peserta}</span></p>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <code className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold tracking-wider text-slate-700">{u.token}</code>
                  <span className="text-[11px] text-slate-400">token</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={u.status === 'publish' ? 'secondary' : 'success'} onClick={() => void toggleStatus(u)}>
                    {u.status === 'publish' ? <><EyeOff size={13} />Batalkan Publikasi</> : <><Eye size={13} />Publikasikan</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Pencil size={13} />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(u)} className="text-rose-600 hover:bg-rose-50"><Trash2 size={13} />Hapus</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Edit Ujian' : 'Buat Ujian'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => void save()} disabled={saving}>{saving ? 'Menyimpan…' : form.id ? 'Simpan' : 'Buat'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Judul Ujian" htmlFor="u-judul">
            <Input id="u-judul" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} placeholder="Contoh: UTS Matematika" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Mata Pelajaran" htmlFor="u-mapel">
              <Select id="u-mapel" value={form.mapelId} onChange={(e) => setForm({ ...form, mapelId: e.target.value, soalIds: [] })}>
                <option value="">— Pilih —</option>
                {mapelSaya.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
              </Select>
            </Field>
            <Field label="Tanggal" htmlFor="u-tgl">
              <Input id="u-tgl" type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </Field>
            <Field label="Jam Mulai" htmlFor="u-jm">
              <Input id="u-jm" type="time" value={form.jamMulai} onChange={(e) => setForm({ ...form, jamMulai: e.target.value })} />
            </Field>
            <Field label="Jam Selesai" htmlFor="u-js">
              <Input id="u-js" type="time" value={form.jamSelesai} onChange={(e) => setForm({ ...form, jamSelesai: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Durasi (menit)" htmlFor="u-durasi">
              <Input id="u-durasi" type="number" min={1} value={form.durasi} onChange={(e) => setForm({ ...form, durasi: Number(e.target.value) })} />
            </Field>
            <Field label="KKM" htmlFor="u-kkm">
              <Input id="u-kkm" type="number" min={0} max={100} value={form.kkm} onChange={(e) => setForm({ ...form, kkm: Number(e.target.value) })} />
            </Field>
            <Field label="Token" htmlFor="u-token">
              <Input id="u-token" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value.toUpperCase() })} placeholder="TOKEN" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status" htmlFor="u-status">
              <Select id="u-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="publish">Publikasikan</option>
              </Select>
            </Field>
            <Field label="Acak Soal" htmlFor="u-acak">
              <Select id="u-acak" value={String(form.acakSoal)} onChange={(e) => setForm({ ...form, acakSoal: e.target.value === 'true' })}>
                <option value="false">Tidak</option>
                <option value="true">Ya</option>
              </Select>
            </Field>
            <Field label="Tampilkan Nilai" htmlFor="u-tampil">
              <Select id="u-tampil" value={String(form.tampilkanNilai)} onChange={(e) => setForm({ ...form, tampilkanNilai: e.target.value === 'true' })}>
                <option value="true">Ya</option>
                <option value="false">Tidak</option>
              </Select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">Kelas Peserta ({form.kelasIds.length} dipilih)</p>
            <div className="flex flex-wrap gap-2">
              {data.kelas.map((k) => {
                const on = form.kelasIds.includes(k.id);
                return (
                  <button key={k.id} type="button" onClick={() => toggleKelas(k.id)}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}>
                    <Users size={12} />{k.nama}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-600 uppercase">
              Pilih Soal ({form.soalIds.length} dari {soalTersedia.length})
            </p>
            {soalTersedia.length === 0 ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Belum ada soal untuk mapel ini. Tambahkan dulu di menu Bank Soal.
              </p>
            ) : (
              <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {soalTersedia.map((s) => {
                  const on = form.soalIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSoal(s.id)}
                      className={`flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        on ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50'
                      }`}>
                      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                        on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                      }`}>{on ? '✓' : ''}</span>
                      <span className="line-clamp-2 flex-1">{s.pertanyaan}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">PG</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}
