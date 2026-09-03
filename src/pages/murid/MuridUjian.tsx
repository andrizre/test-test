import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, CheckCircle2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Button, Card, CardHeader, EmptyState, Input, Select } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate, statusUjian } from '@/lib/utils';

export function MuridUjian() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, loading, error, reload } = useData(async () => {
    if (!user) return null;
    const [ujian, attempts, users, mapel] = await Promise.all([
      api.ujian(), api.attemptsSaya(user.id), api.users(), api.mapel(),
    ]);
    return { ujian, attempts, users, mapel };
  }, [user?.id]);

  const kelasId = useMemo(
    () => data?.users.find((u) => u.id === user?.id)?.kelasId ?? '',
    [data, user?.id],
  );

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.ujian
      .filter((u) => u.status === 'publish' && u.kelasIds.includes(kelasId))
      .map((u) => ({
        ujian: u,
        attempt: data.attempts.find((a) => a.ujianId === u.id),
        st: statusUjian(u),
      }))
      .filter(({ ujian, attempt }) => {
        if (term && !ujian.judul.toLowerCase().includes(term)) return false;
        if (filter === 'tersedia' && attempt?.status === 'selesai') return false;
        if (filter === 'selesai' && attempt?.status !== 'selesai') return false;
        return true;
      });
  }, [q, filter, data, kelasId]);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error ?? 'Data tidak tersedia'} onRetry={reload} /></Card>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Ujian Saya</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Daftar ujian yang tersedia untuk kelasmu</p>
      </div>

      <Card>
        <CardHeader title="Semua Ujian" subtitle={`${list.length} ujian`}
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari ujian…" className="w-full pl-9 sm:w-48" />
              </div>
              <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">Semua</option>
                <option value="tersedia">Belum Dikerjakan</option>
                <option value="selesai">Sudah Selesai</option>
              </Select>
            </div>
          }
        />
        {list.length === 0 ? (
          <EmptyState icon={<CalendarCheck size={40} />} title="Tidak ada ujian" desc="Ujian muncul setelah guru mempublikasikannya" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map(({ ujian: u, attempt, st }) => {
              const done = attempt?.status === 'selesai';
              return (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-800">{u.judul}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">{data.mapel.find((m) => m.id === u.mapelId)?.nama ?? '-'}</p>
                    </div>
                    {done ? (
                      <Badge tone="green"><CheckCircle2 size={11} className="mr-1" />Selesai</Badge>
                    ) : (
                      <Badge tone={st === 'berlangsung' ? 'green' : st === 'akan-datang' ? 'blue' : 'gray'}>
                        {st === 'berlangsung' ? 'Berlangsung' : st === 'akan-datang' ? 'Akan Datang' : 'Ditutup'}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <p className="flex items-center gap-1"><CalendarCheck size={12} />{formatDate(u.tanggal)}</p>
                    <p className="flex items-center gap-1"><Clock size={12} />{u.durasi} menit</p>
                    <p>{u.jamMulai} – {u.jamSelesai}</p>
                    <p>{u.soalIds.length} soal</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    {done ? (
                      <Badge tone="blue">Nilai: {attempt?.nilai ?? '-'}</Badge>
                    ) : (
                      <span className="text-[11px] text-slate-400">Belum dikerjakan</span>
                    )}
                    <Link to={`/murid/ujian/${u.id}`}>
                      <Button size="sm" disabled={done || st !== 'berlangsung'}>
                        {done ? 'Selesai' : st === 'berlangsung' ? 'Kerjakan' : 'Tutup'}
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
