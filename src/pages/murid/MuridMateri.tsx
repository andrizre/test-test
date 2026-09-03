import { useMemo, useState } from 'react';
import { BookOpen, Eye, Search } from 'lucide-react';
import { api, type MateriDTO } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { Modal } from '@/components/Modal';
import { formatDateTime } from '@/lib/utils';

export function MuridMateri() {
  const { data, loading, error, reload } = useData(
    () => Promise.all([api.materi(), api.mapel()]).then(([materi, mapel]) => ({ materi, mapel })),
    [],
  );
  const [q, setQ] = useState('');
  const [filterMapel, setFilterMapel] = useState('all');
  const [baca, setBaca] = useState<MateriDTO | null>(null);

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.materi.filter((m) => {
      if (filterMapel !== 'all' && m.mapelId !== filterMapel) return false;
      if (!term) return true;
      return m.judul.toLowerCase().includes(term) || m.isi.toLowerCase().includes(term);
    });
  }, [q, filterMapel, data]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Materi Belajar</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Baca materi sebelum mengerjakan ujian</p>
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
          <EmptyState icon={<BookOpen size={40} />} title="Belum ada materi" desc="Materi dari guru akan muncul di sini" />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {list.map((m) => (
              <div key={m.id} className="flex flex-col rounded-xl border border-slate-200 p-4">
                <div className="mb-2"><Badge tone="blue">{data.mapel.find((x) => x.id === m.mapelId)?.nama ?? '-'}</Badge></div>
                <p className="text-sm font-semibold text-slate-800">{m.judul}</p>
                <p className="mt-1 line-clamp-3 flex-1 text-xs leading-relaxed text-slate-500">{m.isi}</p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">{formatDateTime(m.createdAt)}</span>
                  <Button size="sm" variant="secondary" onClick={() => setBaca(m)}><Eye size={13} />Baca</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!baca} onClose={() => setBaca(null)} title={baca?.judul ?? ''} size="lg">
        {baca ? (
          <div>
            <div className="mb-3"><Badge tone="blue">{data.mapel.find((x) => x.id === baca.mapelId)?.nama ?? '-'}</Badge></div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{baca.isi}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
