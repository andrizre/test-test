import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/Layout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';

import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminPengguna } from '@/pages/admin/AdminPengguna';
import { AdminKelas } from '@/pages/admin/AdminKelas';
import { AdminMapel } from '@/pages/admin/AdminMapel';
import { AdminPengaturan } from '@/pages/admin/AdminPengaturan';

import { GuruDashboard } from '@/pages/guru/GuruDashboard';
import { GuruBankSoal } from '@/pages/guru/GuruBankSoal';
import { GuruUjian } from '@/pages/guru/GuruUjian';
import { GuruMonitoring } from '@/pages/guru/GuruMonitoring';
import { GuruNilai } from '@/pages/guru/GuruNilai';
import { GuruAnalisis } from '@/pages/guru/GuruAnalisis';
import { GuruFeedback } from '@/pages/guru/GuruFeedback';
import { GuruMateri } from '@/pages/guru/GuruMateri';

import { MuridDashboard } from '@/pages/murid/MuridDashboard';
import { MuridUjian } from '@/pages/murid/MuridUjian';
import { MuridKerjakanUjian } from '@/pages/murid/MuridKerjakanUjian';
import { MuridSelesaiUjian } from '@/pages/murid/MuridSelesaiUjian';
import { MuridHasil } from '@/pages/murid/MuridHasil';
import { MuridLatihan } from '@/pages/murid/MuridLatihan';
import { MuridMateri } from '@/pages/murid/MuridMateri';

import type { Role } from '@/types';

function Guard({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return <Layout>{children}</Layout>;
}

function Home() {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/admin" element={<Guard role="admin"><AdminDashboard /></Guard>} />
      <Route path="/admin/pengguna" element={<Guard role="admin"><AdminPengguna /></Guard>} />
      <Route path="/admin/kelas" element={<Guard role="admin"><AdminKelas /></Guard>} />
      <Route path="/admin/mapel" element={<Guard role="admin"><AdminMapel /></Guard>} />
      <Route path="/admin/pengaturan" element={<Guard role="admin"><AdminPengaturan /></Guard>} />

      <Route path="/guru" element={<Guard role="guru"><GuruDashboard /></Guard>} />
      <Route path="/guru/bank-soal" element={<Guard role="guru"><GuruBankSoal /></Guard>} />
      <Route path="/guru/ujian" element={<Guard role="guru"><GuruUjian /></Guard>} />
      <Route path="/guru/monitoring" element={<Guard role="guru"><GuruMonitoring /></Guard>} />
      <Route path="/guru/nilai" element={<Guard role="guru"><GuruNilai /></Guard>} />
      <Route path="/guru/analisis" element={<Guard role="guru"><GuruAnalisis /></Guard>} />
      <Route path="/guru/feedback" element={<Guard role="guru"><GuruFeedback /></Guard>} />
      <Route path="/guru/materi" element={<Guard role="guru"><GuruMateri /></Guard>} />

      <Route path="/murid" element={<Guard role="murid"><MuridDashboard /></Guard>} />
      <Route path="/murid/ujian" element={<Guard role="murid"><MuridUjian /></Guard>} />
      <Route path="/murid/ujian/:id" element={<Guard role="murid"><MuridKerjakanUjian /></Guard>} />
      <Route path="/murid/ujian/:id/selesai" element={<Guard role="murid"><MuridSelesaiUjian /></Guard>} />
      <Route path="/murid/hasil" element={<Guard role="murid"><MuridHasil /></Guard>} />
      <Route path="/murid/latihan" element={<Guard role="murid"><MuridLatihan /></Guard>} />
      <Route path="/murid/materi" element={<Guard role="murid"><MuridMateri /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
