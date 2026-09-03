import { Link } from 'react-router-dom';
import { Users, School, BookOpen, ClipboardList, TrendingUp, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useData } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { Badge, Card, CardHeader } from '@/components/ui';
import { ErrorBox, Loading } from '@/components/State';
import { formatDate } from '@/lib/utils';

export function AdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useData(async () => {
    const [users, kelas, mapel, ujian, soal] = await Promise.all([
      api.users(), api.kelas(), api.mapel(), api.ujian(), api.soal(),
    ]);
    return { users, kelas, mapel, ujian, soal };
  }, []);

  if (loading) return <Card><Loading /></Card>;
  if (error || !data) return <Card><ErrorBox message={error} onRetry={reload} /></Card>;

  const jml = (role: string) => data.users.filter((u) => u.role === role && u.active).length;

  const stats = [
    { label: 'Total Siswa', value: jml('murid'), icon: <Users size={20} />, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Total Guru', value: jml('guru'), icon: <Users size={20} />, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Kelas', value: data.kelas.length, icon: <School size={20} />, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Mata Pelajaran', value: data.mapel.length, icon: <BookOpen size={20} />, tone: 'text-purple-600 bg-purple-50' },
    { label: 'Total Ujian', value: data.ujian.length, icon: <ClipboardList size={20} />, tone: 'text-rose-600 bg-rose-50' },
    { label: 'Bank Soal', value: data.soal.length, icon: <TrendingUp size={20} />, tone: 'text-indigo-600 bg-indigo-50' },
  ];

  const ujianTerbaru = [...data.ujian].slice(-5).reverse();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800 sm:text-xl">Dashboard Admin</h1>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Selamat datang, {user?.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg ${s.tone}`}>{s.icon}</div>
            <p className="text-xl font-bold text-slate-800 sm:text-2xl">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Ujian Terbaru"
          subtitle="5 ujian terakhir yang dibuat guru"
          action={
            <Link to="/admin/pengguna" className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700">
              Kelola Data <ArrowRight size={13} />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-5">Judul Ujian</th>
                <th className="px-4 py-3 font-semibold">Mapel</th>
                <th className="px-4 py-3 font-semibold">Tanggal</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ujianTerbaru.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">Belum ada ujian</td></tr>
              ) : ujianTerbaru.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800 sm:px-5">{u.judul}</td>
                  <td className="px-4 py-3 text-slate-600">{data.mapel.find((m) => m.id === u.mapelId)?.nama ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(u.tanggal)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === 'publish' ? 'green' : u.status === 'selesai' ? 'blue' : 'gray'}>
                      {u.status === 'publish' ? 'Dipublikasi' : u.status === 'selesai' ? 'Selesai' : 'Draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
