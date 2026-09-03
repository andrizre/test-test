import { db } from './db.js';

export function seedAll() {
  db.exec(`
DELETE FROM feedback; DELETE FROM materi; DELETE FROM attempts; DELETE FROM ujian_soal; DELETE FROM ujian_kelas; DELETE FROM ujian;
DELETE FROM soal; DELETE FROM mapel; DELETE FROM kelas; DELETE FROM users; DELETE FROM pengaturan;

INSERT INTO pengaturan (id, nama_sekolah, tahun_ajaran, semester, kepala_sekolah, alamat) VALUES
 (1, 'SMA Negeri 1 Contoh', '2024/2025', 'Genap', 'Drs. H. Suryanto, M.Pd.', 'Jl. Pendidikan No. 45, Jakarta');

INSERT INTO users (id, username, password, name, role, email, nis, nip, kelas_id, active, created_at) VALUES
 ('u1','admin','admin123','Administrator','admin','admin@sekolah.sch.id',NULL,NULL,NULL,1,'2024-01-01'),
 ('u2','guru1','guru123','Siti Aminah, S.Pd.','guru','siti@sekolah.sch.id',NULL,'198203142008012004',NULL,1,'2024-01-02'),
 ('u3','guru2','guru123','Budi Santoso, S.Pd.','guru','budi@sekolah.sch.id',NULL,'198505102010011008',NULL,1,'2024-01-03'),
 ('u4','guru3','guru123','Rina Wijayanti, S.Pd.','guru','rina@sekolah.sch.id',NULL,'199007222015032001',NULL,1,'2024-01-04'),
 ('u5','murid1','murid123','Andi Pratama','murid',NULL,'2024001',NULL,'k1',1,'2024-01-05'),
 ('u6','murid2','murid123','Bella Kartika','murid',NULL,'2024002',NULL,'k1',1,'2024-01-06'),
 ('u7','murid3','murid123','Citra Dewi','murid',NULL,'2024003',NULL,'k1',1,'2024-01-07'),
 ('u8','murid4','murid123','Dedi Kurniawan','murid',NULL,'2024004',NULL,'k2',1,'2024-01-08'),
 ('u9','murid5','murid123','Eka Saputra','murid',NULL,'2024005',NULL,'k2',1,'2024-01-09'),
 ('u10','murid6','murid123','Fitri Handayani','murid',NULL,'2024006',NULL,'k2',1,'2024-01-10');

INSERT INTO kelas (id, nama, tingkat, jurusan, wali_id) VALUES
 ('k1','X IPA 1','X','IPA','u2'),
 ('k2','X IPA 2','X','IPA','u3'),
 ('k3','XI IPS 1','XI','IPS','u4');

INSERT INTO mapel (id, kode, nama, guru_id) VALUES
 ('m1','MTK','Matematika','u2'),
 ('m2','FIS','Fisika','u3'),
 ('m3','BIO','Biologi','u4'),
 ('m4','BIN','Bahasa Indonesia',NULL);

INSERT INTO soal (id, mapel_id, guru_id, type, level, pertanyaan, opsi, jawaban, bobot, created_at) VALUES
 ('s1','m1','u2','pg','mudah','Berapakah hasil dari 12 x 8?','["84","88","96","104","108"]',2,10,'2024-02-01'),
 ('s2','m1','u2','pg','sedang','Akar-akar dari persamaan x2 - 5x + 6 = 0 adalah...','["1 dan 6","2 dan 3","-2 dan -3","5 dan 6","-1 dan -6"]',1,10,'2024-02-01'),
 ('s3','m1','u2','pg','sulit','Nilai dari lim(x->0) sin(3x)/x adalah...','["0","1","3","-3","tak hingga"]',2,15,'2024-02-02'),
 ('s4','m1','u2','pg','sedang','Bentuk umum fungsi kuadrat adalah...','["f(x) = ax + b","f(x) = ax2 + bx + c","f(x) = a/x","f(x) = akar(x)","f(x) = ax3 + bx2 + c"]',1,10,'2024-02-02'),
 ('s5','m1','u2','pg','mudah','Rumus luas lingkaran dengan jari-jari r adalah...','["pi x r2","2 x pi x r","pi x d2","1/2 x pi x r2","2 x pi x r2"]',0,10,'2024-02-03'),
 ('s6','m2','u3','pg','mudah','Satuan SI untuk gaya adalah...','["Joule","Watt","Newton","Pascal","Ampere"]',2,10,'2024-02-04'),
 ('s7','m2','u3','pg','sedang','Hukum Newton II dirumuskan sebagai...','["F = m/v","F = m.a","F = m.v","F = a/m","F = v/m"]',1,10,'2024-02-04'),
 ('s8','m3','u4','pg','mudah','Organel sel yang berfungsi sebagai penghasil energi adalah...','["Ribosom","Mitokondria","Lisosom","Badan Golgi","Vakuola"]',1,10,'2024-02-05'),
 ('s9','m3','u4','pg','sulit','Proses keluarnya material dari sel melalui vesikel Golgi disebut...','["Endositosis","Eksositosis","Fagositosis","Pinositosis","Difusi"]',1,15,'2024-02-06'),
 ('s10','m2','u3','pg','sedang','Benda bermassa 2 kg dipercepat 3 m/s2. Besar gaya yang bekerja adalah...','["1,5 N","3 N","5 N","6 N","12 N"]',3,10,'2024-02-07');

INSERT INTO ujian (id, judul, mapel_id, guru_id, durasi, tanggal, jam_mulai, jam_selesai, status, token, acak_soal, tampilkan_nilai, kkm, created_at) VALUES
 ('j1','Ulangan Harian Matematika Bab 1','m1','u2',60,'2024-03-15','08:00','09:00','publish','MTK01',1,1,75,'2024-03-01'),
 ('j2','UTS Fisika Semester Genap','m2','u3',45,'2024-03-18','10:00','10:45','publish','FIS99',0,1,70,'2024-03-02'),
 ('j3','Ulangan Biologi - Sel','m3','u4',30,'2024-03-20','09:00','09:30','draft','BIO77',0,0,75,'2024-03-03');

INSERT INTO materi (id, mapel_id, guru_id, judul, isi, created_at) VALUES
 ('mt1','m1','u2','Fungsi Kuadrat',
  'Fungsi kuadrat adalah fungsi polinomial berderajat dua dengan bentuk umum f(x) = ax2 + bx + c, dengan a tidak sama dengan nol.

Ciri-ciri grafik fungsi kuadrat (parabola):
1. Jika a > 0, parabola terbuka ke atas (memiliki titik minimum).
2. Jika a < 0, parabola terbuka ke bawah (memiliki titik maksimum).

Sumbu simetri: x = -b / 2a
Nilai optimum: substitusikan sumbu simetri ke fungsi.

Contoh: f(x) = x2 - 5x + 6 memiliki akar-akar x = 2 dan x = 3 (karena 2 + 3 = 5 dan 2 x 3 = 6).','2024-03-05'),
 ('mt2','m2','u3','Hukum Newton',
  'Hukum Newton terdiri dari tiga hukum gerak dasar:

1. Hukum I (Inersia): Benda akan tetap diam atau bergerak lurus beraturan jika resultan gaya yang bekerja padanya nol.

2. Hukum II: Percepatan benda sebanding dengan resultan gaya dan berbanding terbalik dengan massanya. Dirumuskan F = m x a, dengan F dalam Newton (N), m dalam kg, dan a dalam m/s2.

3. Hukum III (Aksi-Reaksi): Setiap aksi menimbulkan reaksi yang sama besar tetapi berlawanan arah.','2024-03-06');
`);

  const ujianKelas = [['j1', 'k1'], ['j1', 'k2'], ['j2', 'k1'], ['j3', 'k2']];
  const ujianSoal = [
    ['j1', 's1'], ['j1', 's2'], ['j1', 's3'], ['j1', 's4'], ['j1', 's5'],
    ['j2', 's6'], ['j2', 's7'], ['j2', 's10'],
    ['j3', 's8'], ['j3', 's9'],
  ];
  const insKelas = db.prepare('INSERT INTO ujian_kelas (ujian_id, kelas_id) VALUES (?, ?)');
  const insSoal = db.prepare('INSERT INTO ujian_soal (ujian_id, soal_id) VALUES (?, ?)');
  for (const [a, b] of ujianKelas) insKelas.run(a, b);
  for (const [a, b] of ujianSoal) insSoal.run(a, b);

  const insAtt = db.prepare(`INSERT INTO attempts
    (id, ujian_id, murid_id, jawaban, ragu, mulai, selesai, status, nilai_akhir, pelanggaran, pelanggaran_detail, dinilai)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

  insAtt.run('a1', 'j1', 'u5',
    JSON.stringify({ s1: 2, s2: 1, s3: 2, s4: 1, s5: 0 }),
    '[]', '2024-03-15T08:02:00', '2024-03-15T08:47:00', 'selesai', 100, 0, '[]', 1);
  insAtt.run('a2', 'j1', 'u6',
    JSON.stringify({ s1: 2, s2: 0, s3: 2, s4: 0, s5: 0 }),
    '["s3"]', '2024-03-15T08:01:00', '2024-03-15T08:55:00', 'selesai', 64, 1,
    JSON.stringify([{ waktu: '2024-03-15T08:12:30', jenis: 'pindah-tab' }]), 1);
  insAtt.run('a3', 'j1', 'u7',
    JSON.stringify({ s1: 2, s2: 1, s3: 0, s4: 2, s5: 0 }),
    '[]', '2024-03-15T08:03:00', '2024-03-15T08:50:00', 'selesai', 55, 0, '[]', 1);

  const insFb = db.prepare('INSERT INTO feedback (id, ujian_id, murid_id, rating, kesulitan, komentar, created_at) VALUES (?,?,?,?,?,?,?)');
  insFb.run('f1', 'j1', 'u5', 5, 'sedang', 'Soalnya menantang tapi seru, waktunya cukup.', '2024-03-15T09:00:00');
  insFb.run('f2', 'j1', 'u6', 3, 'sulit', 'Soal limit terlalu sulit, belum diajarkan detail.', '2024-03-15T09:02:00');

  return true;
}
