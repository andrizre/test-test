import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, uid, today, now, DB_PATH } from './db.js';
import { seedAll } from './seed-lib.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT) || 3001;

const ok = (res, data) => res.json({ ok: true, data });
const fail = (res, msg, code = 400) => res.status(code).json({ ok: false, error: msg });

const J = (s, fallback) => {
  try { return JSON.parse(s || fallback); } catch { return JSON.parse(fallback); }
};

/* ------------------------------- Helpers -------------------------------- */

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id, username: u.username, password: u.password, name: u.name, role: u.role,
    email: u.email ?? '', nis: u.nis ?? '', nip: u.nip ?? '',
    kelasId: u.kelas_id ?? '', active: Boolean(u.active), createdAt: u.created_at,
  };
}

function mapSoal(s) {
  return {
    id: s.id, mapelId: s.mapel_id, guruId: s.guru_id, type: s.type, level: s.level,
    pertanyaan: s.pertanyaan, opsi: J(s.opsi, '[]'), jawaban: s.jawaban,
    bobot: s.bobot, createdAt: s.created_at,
  };
}

function mapUjian(u) {
  return {
    id: u.id, judul: u.judul, mapelId: u.mapel_id, guruId: u.guru_id,
    kelasIds: db.prepare('SELECT kelas_id FROM ujian_kelas WHERE ujian_id = ?').all(u.id).map((r) => r.kelas_id),
    soalIds: db.prepare('SELECT soal_id FROM ujian_soal WHERE ujian_id = ?').all(u.id).map((r) => r.soal_id),
    durasi: u.durasi, tanggal: u.tanggal, jamMulai: u.jam_mulai, jamSelesai: u.jam_selesai,
    status: u.status, token: u.token, acakSoal: Boolean(u.acak_soal),
    tampilkanNilai: Boolean(u.tampilkan_nilai), kkm: u.kkm, createdAt: u.created_at,
  };
}

function mapAttempt(a) {
  return {
    id: a.id, ujianId: a.ujian_id, muridId: a.murid_id,
    jawaban: J(a.jawaban, '{}'), ragu: J(a.ragu, '[]'),
    mulai: a.mulai, selesai: a.selesai ?? undefined, status: a.status,
    nilai: a.nilai_akhir ?? undefined,
    pelanggaran: a.pelanggaran ?? 0,
    pelanggaranDetail: J(a.pelanggaran_detail, '[]'),
    dinilai: Boolean(a.dinilai),
  };
}

function hitungNilai(soalList, jawaban) {
  if (soalList.length === 0) return 0;
  const totalBobot = soalList.reduce((sum, s) => sum + s.bobot, 0);
  if (totalBobot === 0) return 0;
  const peroleh = soalList.reduce((sum, s) => {
    const ans = jawaban[s.id];
    return sum + (typeof ans === 'number' && ans === s.jawaban ? s.bobot : 0);
  }, 0);
  return Math.round((peroleh / totalBobot) * 100);
}

/* --------------------------------- Auth --------------------------------- */

app.post('/api/auth/login', (req, res) => {
  const { username = '', password = '' } = req.body ?? {};
  const u = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(String(username).trim());
  if (!u || u.password !== password) return fail(res, 'Username atau password salah', 401);
  if (!u.active) return fail(res, 'Akun Anda dinonaktifkan', 403);
  return ok(res, { id: u.id, username: u.username, name: u.name, role: u.role });
});

app.get('/api/auth/me', (req, res) => {
  const id = String(req.query.id ?? '');
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return fail(res, 'Tidak terautentikasi', 401);
  return ok(res, { id: u.id, username: u.username, name: u.name, role: u.role });
});

app.patch('/api/auth/password', (req, res) => {
  const { id, lama, baru } = req.body ?? {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(String(id));
  if (!u) return fail(res, 'Pengguna tidak ditemukan', 404);
  if (u.password !== lama) return fail(res, 'Password lama salah');
  if (!baru || String(baru).length < 5) return fail(res, 'Password baru minimal 5 karakter');
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(String(baru), u.id);
  return ok(res, true);
});

/* --------------------------------- Meta --------------------------------- */

app.get('/api/meta', (_req, res) => {
  const p = db.prepare('SELECT * FROM pengaturan WHERE id = 1').get();
  return ok(res, {
    pengaturan: {
      namaSekolah: p.nama_sekolah, tahunAjaran: p.tahun_ajaran, semester: p.semester,
      kepalaSekolah: p.kepala_sekolah, alamat: p.alamat,
    },
  });
});

app.put('/api/meta/pengaturan', (req, res) => {
  const b = req.body ?? {};
  db.prepare(`UPDATE pengaturan SET nama_sekolah=?, tahun_ajaran=?, semester=?, kepala_sekolah=?, alamat=? WHERE id=1`)
    .run(b.namaSekolah ?? '', b.tahunAjaran ?? '', b.semester ?? '', b.kepalaSekolah ?? '', b.alamat ?? '');
  return ok(res, true);
});

app.post('/api/meta/reset', (_req, res) => {
  seedAll();
  return ok(res, true);
});

/* -------------------------------- Users --------------------------------- */

app.get('/api/users', (req, res) => {
  const role = req.query.role ? String(req.query.role) : null;
  const rows = role ? db.prepare('SELECT * FROM users WHERE role = ?').all(role) : db.prepare('SELECT * FROM users').all();
  return ok(res, rows.map(mapUser));
});

app.post('/api/users', (req, res) => {
  const b = req.body ?? {};
  if (!b.username || !b.name) return fail(res, 'Username dan nama wajib diisi');
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(String(b.username));
  if (exists) return fail(res, 'Username sudah dipakai');
  if (!b.password) return fail(res, 'Password wajib diisi');
  const id = uid('u');
  db.prepare(`INSERT INTO users (id, username, password, name, role, email, nis, nip, kelas_id, active, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, String(b.username), String(b.password), String(b.name), b.role ?? 'murid',
    b.email || null, b.nis || null, b.nip || null, b.kelasId || null,
    b.active === false ? 0 : 1, today());
  return ok(res, { id });
});

app.put('/api/users/:id', (req, res) => {
  const id = req.params.id;
  const b = req.body ?? {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!u) return fail(res, 'Pengguna tidak ditemukan', 404);
  const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id <> ?').get(String(b.username ?? u.username), id);
  if (clash) return fail(res, 'Username sudah dipakai');
  db.prepare(`UPDATE users SET username=?, password=?, name=?, role=?, email=?, nis=?, nip=?, kelas_id=?, active=? WHERE id=?`)
    .run(
      String(b.username ?? u.username), String(b.password ?? u.password), String(b.name ?? u.name),
      b.role ?? u.role, b.email || null, b.nis || null, b.nip || null, b.kelasId || null,
      b.active === undefined ? u.active : (b.active ? 1 : 0), id);
  return ok(res, true);
});

app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM attempts WHERE murid_id = ?').run(id);
  db.prepare('DELETE FROM feedback WHERE murid_id = ?').run(id);
  const r = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return ok(res, { deleted: r.changes });
});

/* -------------------------------- Kelas --------------------------------- */

app.get('/api/kelas', (_req, res) => {
  const rows = db.prepare('SELECT * FROM kelas').all();
  return ok(res, rows.map((k) => ({ id: k.id, nama: k.nama, tingkat: k.tingkat, jurusan: k.jurusan, waliId: k.wali_id ?? '' })));
});

app.post('/api/kelas', (req, res) => {
  const b = req.body ?? {};
  if (!b.nama) return fail(res, 'Nama kelas wajib diisi');
  const id = uid('k');
  db.prepare('INSERT INTO kelas (id, nama, tingkat, jurusan, wali_id) VALUES (?,?,?,?,?)')
    .run(id, String(b.nama), b.tingkat ?? 'X', b.jurusan ?? '', b.waliId || null);
  return ok(res, { id });
});

app.put('/api/kelas/:id', (req, res) => {
  const b = req.body ?? {};
  db.prepare('UPDATE kelas SET nama=?, tingkat=?, jurusan=?, wali_id=? WHERE id=?')
    .run(String(b.nama ?? ''), b.tingkat ?? 'X', b.jurusan ?? '', b.waliId || null, req.params.id);
  return ok(res, true);
});

app.delete('/api/kelas/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM ujian_kelas WHERE kelas_id = ?').run(id);
  db.prepare('UPDATE users SET kelas_id = NULL WHERE kelas_id = ?').run(id);
  const r = db.prepare('DELETE FROM kelas WHERE id = ?').run(id);
  return ok(res, { deleted: r.changes });
});

/* -------------------------------- Mapel --------------------------------- */

app.get('/api/mapel', (_req, res) => {
  const rows = db.prepare('SELECT * FROM mapel').all();
  return ok(res, rows.map((m) => ({ id: m.id, kode: m.kode, nama: m.nama, guruId: m.guru_id ?? '' })));
});

app.post('/api/mapel', (req, res) => {
  const b = req.body ?? {};
  if (!b.nama || !b.kode) return fail(res, 'Kode dan nama wajib diisi');
  const id = uid('m');
  db.prepare('INSERT INTO mapel (id, kode, nama, guru_id) VALUES (?,?,?,?)')
    .run(id, String(b.kode).toUpperCase(), String(b.nama), b.guruId || null);
  return ok(res, { id });
});

app.put('/api/mapel/:id', (req, res) => {
  const b = req.body ?? {};
  db.prepare('UPDATE mapel SET kode=?, nama=?, guru_id=? WHERE id=?')
    .run(String(b.kode ?? '').toUpperCase(), String(b.nama ?? ''), b.guruId || null, req.params.id);
  return ok(res, true);
});

app.delete('/api/mapel/:id', (req, res) => {
  const r = db.prepare('DELETE FROM mapel WHERE id = ?').run(req.params.id);
  return ok(res, { deleted: r.changes });
});

/* --------------------------------- Soal --------------------------------- */

app.get('/api/soal', (req, res) => {
  const guruId = req.query.guruId ? String(req.query.guruId) : null;
  const rows = guruId
    ? db.prepare('SELECT * FROM soal WHERE guru_id = ?').all(guruId)
    : db.prepare('SELECT * FROM soal').all();
  return ok(res, rows.map(mapSoal));
});

const OPSI_WAJIB = 'Soal pilihan ganda wajib memiliki 5 opsi jawaban (A-E) yang terisi semua';

function validasiPg(b) {
  const opsi = (Array.isArray(b.opsi) ? b.opsi : []).map((o) => String(o ?? '').trim());
  if (opsi.length !== 5 || opsi.some((o) => !o)) return { error: OPSI_WAJIB };
  const jawaban = Number(b.jawaban ?? -1);
  if (!Number.isInteger(jawaban) || jawaban < 0 || jawaban > 4) return { error: 'Kunci jawaban wajib dipilih (A-E)' };
  return { opsi, jawaban };
}

app.post('/api/soal', (req, res) => {
  const b = req.body ?? {};
  if (!b.pertanyaan) return fail(res, 'Pertanyaan wajib diisi');
  if (!b.mapelId) return fail(res, 'Pilih mata pelajaran');
  const v = validasiPg(b);
  if (v.error) return fail(res, v.error);
  const id = uid('s');
  db.prepare(`INSERT INTO soal (id, mapel_id, guru_id, type, level, pertanyaan, opsi, jawaban, bobot, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id, String(b.mapelId), String(b.guruId ?? ''), 'pg',
    b.level ?? 'sedang', String(b.pertanyaan), JSON.stringify(v.opsi),
    v.jawaban, Number(b.bobot ?? 10), today());
  return ok(res, { id });
});

app.put('/api/soal/:id', (req, res) => {
  const b = req.body ?? {};
  const s = db.prepare('SELECT * FROM soal WHERE id = ?').get(req.params.id);
  if (!s) return fail(res, 'Soal tidak ditemukan', 404);
  const v = validasiPg(b);
  if (v.error) return fail(res, v.error);
  db.prepare(`UPDATE soal SET mapel_id=?, type=?, level=?, pertanyaan=?, opsi=?, jawaban=?, bobot=? WHERE id=?`)
    .run(String(b.mapelId ?? s.mapel_id), 'pg', b.level ?? s.level,
      String(b.pertanyaan ?? s.pertanyaan), JSON.stringify(v.opsi),
      v.jawaban, Number(b.bobot ?? s.bobot), req.params.id);
  return ok(res, true);
});

app.delete('/api/soal/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM ujian_soal WHERE soal_id = ?').run(id);
  const r = db.prepare('DELETE FROM soal WHERE id = ?').run(id);
  return ok(res, { deleted: r.changes });
});

app.post('/api/soal/import', (req, res) => {
  const b = req.body ?? {};
  const mapelId = String(b.mapelId ?? '');
  const guruId = String(b.guruId ?? '');
  const list = Array.isArray(b.list) ? b.list : [];
  if (!mapelId) return fail(res, 'Pilih mata pelajaran');
  if (list.length === 0) return fail(res, 'Tidak ada soal untuk diimpor');

  const insert = db.prepare(`INSERT INTO soal (id, mapel_id, guru_id, type, level, pertanyaan, opsi, jawaban, bobot, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  let inserted = 0;
  const errors = [];
  list.forEach((raw, i) => {
    const pertanyaan = String(raw?.pertanyaan ?? '').trim();
    const level = ['mudah', 'sedang', 'sulit'].includes(raw?.level) ? raw.level : 'sedang';
    const opsi = (Array.isArray(raw?.opsi) ? raw.opsi : []).map((o) => String(o ?? '').trim());
    const bobot = Math.round(Number(raw?.bobot ?? 10));
    const jawaban = Number(raw?.jawaban ?? -1);

    if (!pertanyaan) { errors.push({ index: i + 1, error: 'Pertanyaan kosong' }); return; }
    if (opsi.length !== 5 || opsi.some((o) => !o)) { errors.push({ index: i + 1, error: OPSI_WAJIB }); return; }
    if (!Number.isInteger(jawaban) || jawaban < 0 || jawaban > 4) { errors.push({ index: i + 1, error: 'Kunci jawaban wajib dipilih (A-E)' }); return; }
    if (!Number.isFinite(bobot) || bobot <= 0) { errors.push({ index: i + 1, error: 'Bobot harus lebih dari 0' }); return; }

    insert.run(uid('s'), mapelId, guruId, 'pg', level, pertanyaan, JSON.stringify(opsi), jawaban, bobot, today());
    inserted++;
  });

  return ok(res, { inserted, skipped: errors.length, errors });
});

/* --------------------------------- Ujian -------------------------------- */

app.get('/api/ujian', (req, res) => {
  const guruId = req.query.guruId ? String(req.query.guruId) : null;
  const rows = guruId
    ? db.prepare('SELECT * FROM ujian WHERE guru_id = ?').all(guruId)
    : db.prepare('SELECT * FROM ujian').all();
  return ok(res, rows.map(mapUjian));
});

app.get('/api/ujian/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(req.params.id);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  return ok(res, mapUjian(u));
});

app.post('/api/ujian', (req, res) => {
  const b = req.body ?? {};
  if (!b.judul) return fail(res, 'Judul ujian wajib diisi');
  const soalIds = b.soalIds ?? [];
  const kelasIds = b.kelasIds ?? [];
  if (soalIds.length === 0) return fail(res, 'Pilih minimal 1 soal');
  if (kelasIds.length === 0) return fail(res, 'Pilih minimal 1 kelas');
  const id = uid('j');
  db.prepare(`INSERT INTO ujian (id, judul, mapel_id, guru_id, durasi, tanggal, jam_mulai, jam_selesai,
    status, token, acak_soal, tampilkan_nilai, kkm, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, String(b.judul), String(b.mapelId), String(b.guruId ?? ''), Number(b.durasi ?? 60),
    b.tanggal ?? today(), b.jamMulai ?? '08:00', b.jamSelesai ?? '09:00',
    b.status ?? 'draft', String(b.token ?? 'TOKEN').toUpperCase(),
    b.acakSoal ? 1 : 0, b.tampilkanNilai === false ? 0 : 1, Number(b.kkm ?? 75), today());
  const ik = db.prepare('INSERT INTO ujian_kelas (ujian_id, kelas_id) VALUES (?, ?)');
  for (const k of kelasIds) ik.run(id, k);
  const is = db.prepare('INSERT INTO ujian_soal (ujian_id, soal_id) VALUES (?, ?)');
  for (const s of soalIds) is.run(id, s);
  return ok(res, { id });
});

app.put('/api/ujian/:id', (req, res) => {
  const id = req.params.id;
  const b = req.body ?? {};
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(id);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  // Full update. Verifikasi idempoten: field yang tidak dikirim memakai nilai lama,
  // sehingga request "hanya ubah status" tetap aman (tidak menimpa judul/soal/dll).
  db.prepare(`UPDATE ujian SET judul=?, mapel_id=?, durasi=?, tanggal=?, jam_mulai=?, jam_selesai=?,
    status=?, token=?, acak_soal=?, tampilkan_nilai=?, kkm=? WHERE id=?`).run(
    String(b.judul ?? u.judul), String(b.mapelId ?? u.mapel_id), Number(b.durasi ?? u.durasi),
    b.tanggal ?? u.tanggal, b.jamMulai ?? u.jam_mulai, b.jamSelesai ?? u.jam_selesai,
    String(b.status ?? u.status), String(b.token ?? u.token).toUpperCase(),
    b.acakSoal === undefined ? u.acak_soal : (b.acakSoal ? 1 : 0),
    b.tampilkanNilai === undefined ? u.tampilkan_nilai : (b.tampilkanNilai ? 1 : 0),
    Number(b.kkm ?? u.kkm), id);
  if (b.kelasIds) {
    db.prepare('DELETE FROM ujian_kelas WHERE ujian_id = ?').run(id);
    const ik = db.prepare('INSERT INTO ujian_kelas (ujian_id, kelas_id) VALUES (?, ?)');
    for (const k of b.kelasIds) ik.run(id, k);
  }
  if (b.soalIds) {
    db.prepare('DELETE FROM ujian_soal WHERE ujian_id = ?').run(id);
    const is = db.prepare('INSERT INTO ujian_soal (ujian_id, soal_id) VALUES (?, ?)');
    for (const s of b.soalIds) is.run(id, s);
  }
  return ok(res, true);
});

app.delete('/api/ujian/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM ujian_kelas WHERE ujian_id = ?').run(id);
  db.prepare('DELETE FROM ujian_soal WHERE ujian_id = ?').run(id);
  db.prepare('DELETE FROM attempts WHERE ujian_id = ?').run(id);
  db.prepare('DELETE FROM feedback WHERE ujian_id = ?').run(id);
  const r = db.prepare('DELETE FROM ujian WHERE id = ?').run(id);
  return ok(res, { deleted: r.changes });
});

/* -------------------------------- Attempts ------------------------------ */

app.get('/api/attempts', (req, res) => {
  const { ujianId, muridId } = req.query;
  let rows;
  if (ujianId) rows = db.prepare('SELECT * FROM attempts WHERE ujian_id = ?').all(String(ujianId));
  else if (muridId) rows = db.prepare('SELECT * FROM attempts WHERE murid_id = ?').all(String(muridId));
  else rows = db.prepare('SELECT * FROM attempts').all();
  return ok(res, rows.map(mapAttempt));
});

app.get('/api/attempts/saya/:muridId', (req, res) => {
  const rows = db.prepare('SELECT * FROM attempts WHERE murid_id = ?').all(req.params.muridId);
  return ok(res, rows.map(mapAttempt));
});

app.put('/api/attempts/:id', (req, res) => {
  const b = req.body ?? {};

  // Upsert: cari berdasarkan id, lalu (ujian_id, murid_id) agar draft tidak dobel
  let a = db.prepare('SELECT * FROM attempts WHERE id = ?').get(req.params.id);
  if (!a && b.ujianId && b.muridId) {
    a = db.prepare('SELECT * FROM attempts WHERE ujian_id = ? AND murid_id = ?').get(String(b.ujianId), String(b.muridId));
  }

  if (a) {
    db.prepare(`UPDATE attempts SET jawaban=?, ragu=?, status=?, selesai=?, nilai_akhir=?, dinilai=?, mulai=?,
      pelanggaran=?, pelanggaran_detail=? WHERE id=?`).run(
      JSON.stringify(b.jawaban ?? J(a.jawaban, '{}')), JSON.stringify(b.ragu ?? J(a.ragu, '[]')),
      b.status ?? a.status, b.selesai ?? a.selesai,
      b.nilai === undefined ? a.nilai_akhir : (b.nilai === null ? null : Number(b.nilai)),
      b.dinilai === undefined ? a.dinilai : (b.dinilai ? 1 : 0),
      b.mulai ?? a.mulai,
      b.pelanggaran === undefined ? a.pelanggaran : Math.max(0, Math.round(Number(b.pelanggaran) || 0)),
      JSON.stringify(b.pelanggaranDetail ?? J(a.pelanggaran_detail, '[]')),
      a.id);
    return ok(res, { id: a.id, mode: 'update' });
  }

  if (!b.ujianId || !b.muridId) return fail(res, 'ujianId dan muridId wajib diisi');

  const id = b.id ?? uid('a');
  db.prepare(`INSERT INTO attempts (id, ujian_id, murid_id, jawaban, ragu, mulai, selesai, status,
    nilai_akhir, pelanggaran, pelanggaran_detail, dinilai) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, String(b.ujianId), String(b.muridId), JSON.stringify(b.jawaban ?? {}), JSON.stringify(b.ragu ?? []),
    b.mulai ?? now(), b.selesai ?? null, b.status ?? 'mengerjakan',
    b.nilai ?? null, Math.max(0, Math.round(Number(b.pelanggaran ?? 0)) || 0),
    JSON.stringify(Array.isArray(b.pelanggaranDetail) ? b.pelanggaranDetail : []), b.dinilai ? 1 : 0);
  return ok(res, { id, mode: 'insert' });
});

app.post('/api/attempts/submit', (req, res) => {
  const b = req.body ?? {};
  const { ujianId, muridId, jawaban = {}, ragu = [], mulai, pelanggaran = 0, pelanggaranDetail = [] } = b;
  if (!ujianId || !muridId) return fail(res, 'Data submit tidak lengkap');

  const soalIds = db.prepare('SELECT soal_id FROM ujian_soal WHERE ujian_id = ?').all(ujianId).map((r) => r.soal_id);
  const soalList = soalIds
    .map((sid) => db.prepare('SELECT * FROM soal WHERE id = ?').get(sid))
    .filter(Boolean)
    .map(mapSoal);

  const nilai = hitungNilai(soalList, jawaban);
  const id = uid('a');

  // Hapus draft attempt lama dulu agar tidak menabrak UNIQUE(ujian_id, murid_id)
  db.prepare('DELETE FROM attempts WHERE ujian_id = ? AND murid_id = ?').run(ujianId, muridId);

  db.prepare(`INSERT INTO attempts (id, ujian_id, murid_id, jawaban, ragu, mulai, selesai, status,
    nilai_akhir, pelanggaran, pelanggaran_detail, dinilai) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, String(ujianId), String(muridId), JSON.stringify(jawaban), JSON.stringify(ragu),
    mulai ?? now(), now(), 'selesai', nilai,
    Math.max(0, Math.round(Number(pelanggaran) || 0)),
    JSON.stringify(Array.isArray(pelanggaranDetail) ? pelanggaranDetail : []), 1);

  return ok(res, { id, nilai, dinilai: true });
});

app.delete('/api/attempts/:id', (req, res) => {
  const r = db.prepare('DELETE FROM attempts WHERE id = ?').run(req.params.id);
  return ok(res, { deleted: r.changes });
});

/* ------------------------------ Monitoring ------------------------------ */

app.get('/api/monitoring/:ujianId', (req, res) => {
  const ujianId = req.params.ujianId;
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(ujianId);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  const kelasIds = db.prepare('SELECT kelas_id FROM ujian_kelas WHERE ujian_id = ?').all(ujianId).map((r) => r.kelas_id);
  if (kelasIds.length === 0) return ok(res, []);
  const ph = kelasIds.map(() => '?').join(',');
  const murid = db.prepare(`SELECT * FROM users WHERE role='murid' AND kelas_id IN (${ph})`).all(...kelasIds);
  const atts = db.prepare('SELECT * FROM attempts WHERE ujian_id = ?').all(ujianId);
  return ok(res, murid.map((m) => {
    const a = atts.find((x) => x.murid_id === m.id);
    return { murid: mapUser(m), attempt: a ? mapAttempt(a) : null };
  }));
});

/* --------------------------------- Nilai -------------------------------- */

app.get('/api/nilai/:ujianId', (req, res) => {
  const ujianId = req.params.ujianId;
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(ujianId);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  const soalIds = db.prepare('SELECT soal_id FROM ujian_soal WHERE ujian_id = ?').all(ujianId).map((r) => r.soal_id);
  const soalList = soalIds.map((sid) => db.prepare('SELECT * FROM soal WHERE id = ?').get(sid)).filter(Boolean).map(mapSoal);
  const atts = db.prepare('SELECT * FROM attempts WHERE ujian_id = ?').all(ujianId);
  return ok(res, atts.map((a) => {
    const murid = db.prepare('SELECT * FROM users WHERE id = ?').get(a.murid_id);
    return {
      attempt: mapAttempt(a),
      murid: mapUser(murid),
      soalList,
    };
  }).filter((r) => r.murid));
});

/* ------------------------------- Feedback ------------------------------- */

app.post('/api/feedback', (req, res) => {
  const b = req.body ?? {};
  const ujianId = String(b.ujianId ?? '');
  const muridId = String(b.muridId ?? '');
  const rating = Number(b.rating ?? 0);
  const kesulitan = String(b.kesulitan ?? '');
  if (!ujianId || !muridId) return fail(res, 'Data feedback tidak lengkap');
  if (!db.prepare('SELECT id FROM ujian WHERE id = ?').get(ujianId)) return fail(res, 'Ujian tidak ditemukan', 404);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(res, 'Rating wajib 1-5');
  if (!['mudah', 'sedang', 'sulit'].includes(kesulitan)) return fail(res, 'Pilih tingkat kesulitan');

  const komentar = String(b.komentar ?? '').trim();
  const existing = db.prepare('SELECT id FROM feedback WHERE ujian_id = ? AND murid_id = ?').get(ujianId, muridId);
  if (existing) {
    db.prepare('UPDATE feedback SET rating=?, kesulitan=?, komentar=?, created_at=? WHERE id=?')
      .run(rating, kesulitan, komentar, now(), existing.id);
    return ok(res, { id: existing.id, mode: 'update' });
  }
  const id = uid('f');
  db.prepare('INSERT INTO feedback (id, ujian_id, murid_id, rating, kesulitan, komentar, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, ujianId, muridId, rating, kesulitan, komentar, now());
  return ok(res, { id, mode: 'insert' });
});

app.get('/api/feedback', (req, res) => {
  const ujianId = req.query.ujianId ? String(req.query.ujianId) : null;
  const rows = ujianId
    ? db.prepare('SELECT * FROM feedback WHERE ujian_id = ?').all(ujianId)
    : db.prepare('SELECT * FROM feedback').all();
  const list = rows.map((f) => ({
    id: f.id, ujianId: f.ujian_id, muridId: f.murid_id, rating: f.rating,
    kesulitan: f.kesulitan, komentar: f.komentar, createdAt: f.created_at,
    murid: mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(f.murid_id)),
  })).filter((f) => f.murid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const rekap = {
    total: list.length,
    rataRating: list.length > 0 ? Math.round((list.reduce((s, f) => s + f.rating, 0) / list.length) * 10) / 10 : 0,
    distribusi: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    kesulitan: { mudah: 0, sedang: 0, sulit: 0 },
  };
  for (const f of list) { rekap.distribusi[f.rating]++; rekap.kesulitan[f.kesulitan]++; }
  return ok(res, { list, rekap });
});

/* -------------------------------- Ranking ------------------------------- */

app.get('/api/ranking/:ujianId', (req, res) => {
  const ujianId = req.params.ujianId;
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(ujianId);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  const atts = db.prepare(`SELECT * FROM attempts WHERE ujian_id = ? AND status = 'selesai'`).all(ujianId);
  const list = atts.map((a) => {
    const m = db.prepare('SELECT * FROM users WHERE id = ?').get(a.murid_id);
    const kelas = m?.kelas_id ? db.prepare('SELECT nama FROM kelas WHERE id = ?').get(m.kelas_id) : null;
    const detik = a.selesai
      ? Math.max(0, Math.floor((new Date(a.selesai).getTime() - new Date(a.mulai).getTime()) / 1000))
      : 0;
    return {
      muridId: a.murid_id, nama: m?.name ?? '', nis: m?.nis ?? '', kelas: kelas?.nama ?? '',
      nilai: a.nilai_akhir ?? 0, waktuDetik: detik,
    };
  }).filter((r) => r.nama)
    .sort((x, y) => y.nilai - x.nilai || x.waktuDetik - y.waktuDetik)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return ok(res, { list, total: list.length });
});

/* ------------------------------- Statistik ------------------------------ */

app.get('/api/ujian/:id/statistik', (req, res) => {
  const ujianId = req.params.id;
  const u = db.prepare('SELECT * FROM ujian WHERE id = ?').get(ujianId);
  if (!u) return fail(res, 'Ujian tidak ditemukan', 404);
  const soalIds = db.prepare('SELECT soal_id FROM ujian_soal WHERE ujian_id = ?').all(ujianId).map((r) => r.soal_id);
  const soalList = soalIds.map((sid) => db.prepare('SELECT * FROM soal WHERE id = ?').get(sid)).filter(Boolean).map(mapSoal);
  const atts = db.prepare(`SELECT * FROM attempts WHERE ujian_id = ? AND status = 'selesai'`).all(ujianId);
  const n = atts.length;

  const nilaiList = atts.map((a) => a.nilai_akhir ?? 0).sort((x, y) => x - y);
  const rata = n > 0 ? Math.round(nilaiList.reduce((s, v) => s + v, 0) / n) : 0;
  const median = n === 0 ? 0
    : (n % 2 === 1 ? nilaiList[(n - 1) / 2] : Math.round((nilaiList[n / 2 - 1] + nilaiList[n / 2]) / 2));
  const stDev = n > 0
    ? Math.round(Math.sqrt(nilaiList.reduce((s, v) => s + (v - rata) ** 2, 0) / n) * 10) / 10
    : 0;
  const kkm = u.kkm;
  const lulus = nilaiList.filter((v) => v >= kkm).length;

  const soal = soalList.map((s, i) => {
    const distribusi = [0, 0, 0, 0, 0];
    let benar = 0;
    let terjawab = 0;
    for (const a of atts) {
      const ans = J(a.jawaban, '{}')[s.id];
      if (typeof ans === 'number' && Number.isInteger(ans) && ans >= 0 && ans <= 4) {
        distribusi[ans]++;
        terjawab++;
        if (ans === s.jawaban) benar++;
      }
    }
    return {
      id: s.id, no: i + 1, pertanyaan: s.pertanyaan, kunci: s.jawaban, opsi: s.opsi,
      level: s.level, bobot: s.bobot, distribusi, terjawab,
      benar, salah: terjawab - benar, kosong: n - terjawab,
      pctBenar: n > 0 ? Math.round((benar / n) * 100) : 0,
    };
  });

  return ok(res, {
    peserta: n, kkm,
    nilai: {
      rata, median, tertinggi: n > 0 ? nilaiList[n - 1] : 0, terendah: n > 0 ? nilaiList[0] : 0,
      stDev, lulus, tidakLulus: n - lulus,
    },
    soal,
  });
});

/* -------------------------------- Latihan ------------------------------- */

app.get('/api/latihan', (req, res) => {
  const mapelId = String(req.query.mapelId ?? '');
  if (!mapelId) return fail(res, 'Pilih mata pelajaran');
  const rows = db.prepare('SELECT * FROM soal WHERE mapel_id = ? ORDER BY created_at').all(mapelId);
  return ok(res, rows.map((s) => ({
    id: s.id, level: s.level, pertanyaan: s.pertanyaan, opsi: J(s.opsi, '[]'),
  })));
});

app.post('/api/latihan/cek', (req, res) => {
  const b = req.body ?? {};
  const s = db.prepare('SELECT * FROM soal WHERE id = ?').get(String(b.soalId ?? ''));
  if (!s) return fail(res, 'Soal tidak ditemukan', 404);
  const jawaban = Number(b.jawaban ?? -1);
  const benar = Number.isInteger(jawaban) && jawaban >= 0 && jawaban <= 4 && jawaban === s.jawaban;
  return ok(res, { benar, jawabanBenar: s.jawaban });
});

/* --------------------------------- Materi ------------------------------- */

function mapMateri(m) {
  return { id: m.id, mapelId: m.mapel_id, guruId: m.guru_id, judul: m.judul, isi: m.isi, createdAt: m.created_at };
}

app.get('/api/materi', (req, res) => {
  const mapelId = req.query.mapelId ? String(req.query.mapelId) : null;
  const rows = mapelId
    ? db.prepare('SELECT * FROM materi WHERE mapel_id = ? ORDER BY created_at DESC').all(mapelId)
    : db.prepare('SELECT * FROM materi ORDER BY created_at DESC').all();
  return ok(res, rows.map(mapMateri));
});

app.post('/api/materi', (req, res) => {
  const b = req.body ?? {};
  if (!String(b.judul ?? '').trim()) return fail(res, 'Judul materi wajib diisi');
  if (!b.mapelId) return fail(res, 'Pilih mata pelajaran');
  if (!String(b.isi ?? '').trim()) return fail(res, 'Isi materi wajib diisi');
  const id = uid('mt');
  db.prepare('INSERT INTO materi (id, mapel_id, guru_id, judul, isi, created_at) VALUES (?,?,?,?,?,?)')
    .run(id, String(b.mapelId), String(b.guruId ?? ''), String(b.judul).trim(), String(b.isi), today());
  return ok(res, { id });
});

app.put('/api/materi/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM materi WHERE id = ?').get(req.params.id);
  if (!m) return fail(res, 'Materi tidak ditemukan', 404);
  const b = req.body ?? {};
  db.prepare('UPDATE materi SET mapel_id=?, judul=?, isi=? WHERE id=?')
    .run(String(b.mapelId ?? m.mapel_id), String(b.judul ?? m.judul).trim(), String(b.isi ?? m.isi), req.params.id);
  return ok(res, true);
});

app.delete('/api/materi/:id', (req, res) => {
  const r = db.prepare('DELETE FROM materi WHERE id = ?').run(req.params.id);
  return ok(res, { deleted: r.changes });
});

/* ------------------------------ Healthcheck ----------------------------- */

app.get('/api/health', (_req, res) => ok(res, { status: 'ok', db: DB_PATH, time: now() }));

/* ------------------------- Static frontend (dist) ----------------------- */

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return fail(res, 'Endpoint tidak ditemukan', 404);
  return next();
});

const DIST = resolve(ROOT, 'dist');
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(resolve(DIST, 'index.html')));
  console.log('Frontend statis → ' + DIST);
} else {
  app.get('*', (_req, res) => res.type('text').send('Frontend belum di-build. Jalankan: npm run build'));
}

app.listen(PORT, () => {
  console.log('API UjianOnline  →  http://localhost:' + PORT);
  console.log('Database SQLite  →  ' + DB_PATH);
});
