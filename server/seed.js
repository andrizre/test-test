import { seedAll } from './seed-lib.js';
import { db } from './db.js';

seedAll();
console.log('Seed selesai.');
console.log('Users :', db.prepare('SELECT COUNT(*) c FROM users').get().c);
console.log('Kelas :', db.prepare('SELECT COUNT(*) c FROM kelas').get().c);
console.log('Mapel :', db.prepare('SELECT COUNT(*) c FROM mapel').get().c);
console.log('Soal  :', db.prepare('SELECT COUNT(*) c FROM soal').get().c);
console.log('Ujian :', db.prepare('SELECT COUNT(*) c FROM ujian').get().c);
console.log('Nilai :', db.prepare('SELECT COUNT(*) c FROM attempts').get().c);
