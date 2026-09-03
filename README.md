# UjianOnline - Website Ujian Sekolah

Aplikasi ujian sekolah berbasis web dengan 3 peran pengguna: **Admin**, **Guru**, dan **Murid**.

## Fitur

### Admin
- Dashboard statistik (jumlah siswa, guru, kelas, mapel, ujian)
- Kelola data pengguna (guru & murid)
- Kelola data kelas
- Kelola data mata pelajaran
- Pengaturan sekolah

### Guru
- Dashboard & ujian aktif
- Bank soal (pilihan ganda & essay) — **impor massal (CSV / paste teks)** & **ekspor CSV**
- Membuat & mengelola ujian (atur soal, kelas, waktu, token)
- Monitoring peserta ujian secara real-time
- Penilaian & rekap nilai — **ekspor rekap nilai (CSV)**
- **Analisis soal** — statistik pengerjaan & tingkat kesulitan per soal

### Murid
- Dashboard ujian yang tersedia
- Mengikuti ujian dengan timer & penyimpanan otomatis
- Melihat hasil & nilai ujian

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Akun Demo

| Peran  | Username | Password |
|--------|----------|----------|
| Admin  | admin    | admin123 |
| Guru   | guru1    | guru123  |
| Murid  | murid1   | murid123 |

## Teknologi

React 18, TypeScript, Vite, Tailwind CSS 4, React Router. Data disimpan di `localStorage`.
