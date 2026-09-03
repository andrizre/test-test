const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Pastikan server API berjalan di ' + BASE);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('Respons server tidak valid (HTTP ' + res.status + ')');
  }

  const body = json as { ok?: boolean; data?: T; error?: string };
  if (!res.ok || body.ok === false) {
    throw new ApiError(body.error ?? 'Terjadi kesalahan pada server');
  }
  return body.data as T;
}

const get = <T>(p: string) => req<T>(p);
const post = <T>(p: string, b?: unknown) => req<T>(p, { method: 'POST', body: JSON.stringify(b ?? {}) });
const put = <T>(p: string, b?: unknown) => req<T>(p, { method: 'PUT', body: JSON.stringify(b ?? {}) });
const del = <T>(p: string) => req<T>(p, { method: 'DELETE' });

export interface LoginResult { id: string; username: string; name: string; role: string }

export const api = {
  // Auth
  login: (username: string, password: string) =>
    post<LoginResult>('/auth/login', { username, password }),
  me: (id: string) => get<LoginResult>('/auth/me?id=' + encodeURIComponent(id)),
  gantiPassword: (id: string, lama: string, baru: string) =>
    put<boolean>('/auth/password', { id, lama, baru }),

  // Meta
  meta: () => get<{ pengaturan: PengaturanDTO }>('/meta'),
  simpanPengaturan: (p: PengaturanDTO) => put<boolean>('/meta/pengaturan', p),
  reset: () => post<boolean>('/meta/reset'),

  // Users
  users: (role?: string) => get<UserDTO[]>('/users' + (role ? '?role=' + role : '')),
  tambahUser: (u: Partial<UserDTO> & { password: string }) => post<{ id: string }>('/users', u),
  updateUser: (id: string, u: Partial<UserDTO>) => put<boolean>('/users/' + id, u),
  hapusUser: (id: string) => del<{ deleted: number }>('/users/' + id),

  // Kelas / Mapel
  kelas: () => get<KelasDTO[]>('/kelas'),
  tambahKelas: (k: Partial<KelasDTO>) => post<{ id: string }>('/kelas', k),
  updateKelas: (id: string, k: Partial<KelasDTO>) => put<boolean>('/kelas/' + id, k),
  hapusKelas: (id: string) => del<{ deleted: number }>('/kelas/' + id),

  mapel: () => get<MapelDTO[]>('/mapel'),
  tambahMapel: (m: Partial<MapelDTO>) => post<{ id: string }>('/mapel', m),
  updateMapel: (id: string, m: Partial<MapelDTO>) => put<boolean>('/mapel/' + id, m),
  hapusMapel: (id: string) => del<{ deleted: number }>('/mapel/' + id),

  // Soal
  soal: (guruId?: string) => get<SoalDTO[]>('/soal' + (guruId ? '?guruId=' + guruId : '')),
  tambahSoal: (s: Partial<SoalDTO>) => post<{ id: string }>('/soal', s),
  updateSoal: (id: string, s: Partial<SoalDTO>) => put<boolean>('/soal/' + id, s),
  hapusSoal: (id: string) => del<{ deleted: number }>('/soal/' + id),
  importSoal: (b: { mapelId: string; guruId: string; list: ImportSoalDTO[] }) =>
    post<{ inserted: number; skipped: number; errors: { index: number; error: string }[] }>('/soal/import', b),

  // Ujian
  ujian: (guruId?: string) => get<UjianDTO[]>('/ujian' + (guruId ? '?guruId=' + guruId : '')),
  ujianById: (id: string) => get<UjianDTO>('/ujian/' + id),
  tambahUjian: (u: Partial<UjianDTO>) => post<{ id: string }>('/ujian', u),
  updateUjian: (id: string, u: Partial<UjianDTO>) => put<boolean>('/ujian/' + id, u),
  hapusUjian: (id: string) => del<{ deleted: number }>('/ujian/' + id),

  // Attempts
  attempts: (q: { ujianId?: string; muridId?: string }) =>
    get<AttemptDTO[]>('/attempts' + (q.ujianId ? '?ujianId=' + q.ujianId : q.muridId ? '?muridId=' + q.muridId : '')),
  attemptsSaya: (muridId: string) => get<AttemptDTO[]>('/attempts/saya/' + muridId),
  updateAttempt: (id: string, a: Partial<AttemptDTO>) => put<boolean>('/attempts/' + id, a),
  submitAttempt: (b: {
    ujianId: string; muridId: string; jawaban: Record<string, number>; ragu: string[]; mulai: string;
    pelanggaran?: number; pelanggaranDetail?: PelanggaranDTO[];
  }) => post<{ id: string; nilai: number; dinilai: boolean }>('/attempts/submit', b),
  hapusAttempt: (id: string) => del<{ deleted: number }>('/attempts/' + id),

  // Monitoring, Nilai, Ranking, Statistik
  monitoring: (ujianId: string) => get<MonitoringDTO[]>('/monitoring/' + ujianId),
  nilai: (ujianId: string) => get<NilaiDTO[]>('/nilai/' + ujianId),
  ranking: (ujianId: string) => get<RankingResultDTO>('/ranking/' + ujianId),
  statistik: (ujianId: string) => get<StatistikDTO>('/ujian/' + ujianId + '/statistik'),

  // Feedback
  kirimFeedback: (b: { ujianId: string; muridId: string; rating: number; kesulitan: string; komentar: string }) =>
    post<{ id: string; mode: string }>('/feedback', b),
  feedback: (ujianId: string) => get<FeedbackResultDTO>('/feedback?ujianId=' + ujianId),

  // Latihan
  latihan: (mapelId: string) => get<LatihanSoalDTO[]>('/latihan?mapelId=' + mapelId),
  latihanCek: (soalId: string, jawaban: number) =>
    post<{ benar: boolean; jawabanBenar: number }>('/latihan/cek', { soalId, jawaban }),

  // Materi
  materi: (mapelId?: string) => get<MateriDTO[]>('/materi' + (mapelId ? '?mapelId=' + mapelId : '')),
  tambahMateri: (m: Partial<MateriDTO>) => post<{ id: string }>('/materi', m),
  updateMateri: (id: string, m: Partial<MateriDTO>) => put<boolean>('/materi/' + id, m),
  hapusMateri: (id: string) => del<{ deleted: number }>('/materi/' + id),

  health: () => get<{ status: string; db: string }>('/health'),
};

export interface PengaturanDTO {
  namaSekolah: string; tahunAjaran: string; semester: string; kepalaSekolah: string; alamat: string;
}
export interface UserDTO {
  id: string; username: string; password: string; name: string; role: string;
  email: string; nis: string; nip: string; kelasId: string; active: boolean; createdAt: string;
}
export interface KelasDTO { id: string; nama: string; tingkat: string; jurusan: string; waliId: string }
export interface MapelDTO { id: string; kode: string; nama: string; guruId: string }
export interface SoalDTO {
  id: string; mapelId: string; guruId: string; type: string; level: string;
  pertanyaan: string; opsi: string[]; jawaban: number; bobot: number; createdAt: string;
}
export interface UjianDTO {
  id: string; judul: string; mapelId: string; guruId: string; kelasIds: string[]; soalIds: string[];
  durasi: number; tanggal: string; jamMulai: string; jamSelesai: string; status: string;
  token: string; acakSoal: boolean; tampilkanNilai: boolean; kkm: number; createdAt: string;
}
export interface PelanggaranDTO { waktu: string; jenis: string }
export interface AttemptDTO {
  id: string; ujianId: string; muridId: string;
  jawaban: Record<string, number>; ragu: string[];
  mulai: string; selesai?: string; status: string;
  nilai?: number; dinilai: boolean;
  pelanggaran: number; pelanggaranDetail: PelanggaranDTO[];
}
export interface MonitoringDTO { murid: UserDTO; attempt: AttemptDTO | null }
export interface NilaiDTO { attempt: AttemptDTO; murid: UserDTO; soalList: SoalDTO[] }
export interface ImportSoalDTO { pertanyaan: string; opsi: string[]; jawaban: number; bobot: number; level: string }

export interface RankingItemDTO {
  rank: number; muridId: string; nama: string; nis: string; kelas: string;
  nilai: number; waktuDetik: number;
}
export interface RankingResultDTO { list: RankingItemDTO[]; total: number }

export interface StatistikSoalDTO {
  id: string; no: number; pertanyaan: string; kunci: number; opsi: string[];
  level: string; bobot: number; distribusi: number[];
  terjawab: number; benar: number; salah: number; kosong: number; pctBenar: number;
}
export interface StatistikDTO {
  peserta: number; kkm: number;
  nilai: { rata: number; median: number; tertinggi: number; terendah: number; stDev: number; lulus: number; tidakLulus: number };
  soal: StatistikSoalDTO[];
}

export interface FeedbackDTO {
  id: string; ujianId: string; muridId: string; rating: number; kesulitan: string;
  komentar: string; createdAt: string; murid: UserDTO | null;
}
export interface FeedbackRekapDTO {
  total: number; rataRating: number;
  distribusi: Record<string, number>;
  kesulitan: Record<string, number>;
}
export interface FeedbackResultDTO { list: FeedbackDTO[]; rekap: FeedbackRekapDTO }

export interface LatihanSoalDTO { id: string; level: string; pertanyaan: string; opsi: string[] }
export interface MateriDTO { id: string; mapelId: string; guruId: string; judul: string; isi: string; createdAt: string }
