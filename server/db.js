import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || resolve(ROOT, 'data', 'ujian.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id        TEXT PRIMARY KEY,
  username  TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,
  name      TEXT NOT NULL,
  role      TEXT NOT NULL CHECK (role IN ('admin','guru','murid')),
  email     TEXT,
  nis       TEXT,
  nip       TEXT,
  kelas_id  TEXT,
  active    INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kelas (
  id       TEXT PRIMARY KEY,
  nama     TEXT NOT NULL,
  tingkat  TEXT NOT NULL,
  jurusan  TEXT NOT NULL,
  wali_id  TEXT
);

CREATE TABLE IF NOT EXISTS mapel (
  id      TEXT PRIMARY KEY,
  kode    TEXT NOT NULL,
  nama    TEXT NOT NULL,
  guru_id TEXT
);

CREATE TABLE IF NOT EXISTS soal (
  id          TEXT PRIMARY KEY,
  mapel_id    TEXT NOT NULL,
  guru_id     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'pg' CHECK (type = 'pg'),
  level       TEXT NOT NULL CHECK (level IN ('mudah','sedang','sulit')),
  pertanyaan  TEXT NOT NULL,
  opsi        TEXT NOT NULL DEFAULT '[]',
  jawaban     INTEGER NOT NULL DEFAULT -1 CHECK (jawaban >= 0 AND jawaban <= 4),
  bobot       INTEGER NOT NULL DEFAULT 10,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ujian (
  id              TEXT PRIMARY KEY,
  judul           TEXT NOT NULL,
  mapel_id        TEXT NOT NULL,
  guru_id         TEXT NOT NULL,
  durasi          INTEGER NOT NULL DEFAULT 60,
  tanggal         TEXT NOT NULL,
  jam_mulai       TEXT NOT NULL,
  jam_selesai     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','publish','selesai')),
  token           TEXT NOT NULL,
  acak_soal       INTEGER NOT NULL DEFAULT 0,
  tampilkan_nilai INTEGER NOT NULL DEFAULT 1,
  kkm             INTEGER NOT NULL DEFAULT 75,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ujian_kelas (
  ujian_id TEXT NOT NULL,
  kelas_id TEXT NOT NULL,
  PRIMARY KEY (ujian_id, kelas_id)
);

CREATE TABLE IF NOT EXISTS ujian_soal (
  ujian_id TEXT NOT NULL,
  soal_id  TEXT NOT NULL,
  PRIMARY KEY (ujian_id, soal_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id                 TEXT PRIMARY KEY,
  ujian_id           TEXT NOT NULL,
  murid_id           TEXT NOT NULL,
  jawaban            TEXT NOT NULL DEFAULT '{}',
  ragu               TEXT NOT NULL DEFAULT '[]',
  mulai              TEXT NOT NULL,
  selesai            TEXT,
  status             TEXT NOT NULL DEFAULT 'mengerjakan' CHECK (status IN ('mengerjakan','selesai')),
  nilai_akhir        INTEGER,
  pelanggaran        INTEGER NOT NULL DEFAULT 0,
  pelanggaran_detail TEXT NOT NULL DEFAULT '[]',
  dinilai            INTEGER NOT NULL DEFAULT 0,
  UNIQUE (ujian_id, murid_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  ujian_id   TEXT NOT NULL,
  murid_id   TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kesulitan  TEXT NOT NULL CHECK (kesulitan IN ('mudah','sedang','sulit')),
  komentar   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  UNIQUE (ujian_id, murid_id)
);

CREATE TABLE IF NOT EXISTS materi (
  id         TEXT PRIMARY KEY,
  mapel_id   TEXT NOT NULL,
  guru_id    TEXT NOT NULL,
  judul      TEXT NOT NULL,
  isi        TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pengaturan (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nama_sekolah   TEXT NOT NULL,
  tahun_ajaran   TEXT NOT NULL,
  semester       TEXT NOT NULL,
  kepala_sekolah TEXT NOT NULL,
  alamat         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_soal_guru ON soal(guru_id);
CREATE INDEX IF NOT EXISTS idx_ujian_guru ON ujian(guru_id);
CREATE INDEX IF NOT EXISTS idx_attempt_ujian ON attempts(ujian_id);
CREATE INDEX IF NOT EXISTS idx_attempt_murid ON attempts(murid_id);
CREATE INDEX IF NOT EXISTS idx_feedback_ujian ON feedback(ujian_id);
CREATE INDEX IF NOT EXISTS idx_materi_mapel ON materi(mapel_id);
`);

export { DB_PATH };

export function now() {
  return new Date().toISOString();
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

export function uid(prefix) {
  return prefix + Math.random().toString(36).slice(2, 9);
}
