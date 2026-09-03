export type SoalLevel = 'mudah' | 'sedang' | 'sulit';

export interface ImportSoal {
  pertanyaan: string;
  opsi: string[];
  jawaban: number;
  bobot: number;
  level: SoalLevel;
  error?: string;
}

const LEVELS: SoalLevel[] = ['mudah', 'sedang', 'sulit'];
const ESSAY_ERROR = 'Tipe essay tidak didukung — soal wajib pilihan ganda A-E';

function normLevel(v: string | undefined): SoalLevel {
  const s = (v ?? '').trim().toLowerCase();
  return (LEVELS as string[]).includes(s) ? (s as SoalLevel) : 'sedang';
}

function normJawaban(v: string | undefined): number {
  if (v === undefined || v === null) return -1;
  const s = String(v).trim();
  if (s === '' || s === '-' || s.toLowerCase() === 'x' || s.toLowerCase() === 'tidak ada') return -1;
  if (/^[A-Ea-e]$/.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
  const n = Number(s);
  if (Number.isNaN(n) || !Number.isInteger(n)) return -1;
  return n >= 0 && n <= 4 ? n : -1;
}

function num(v: string | undefined, fallback: number): number {
  const s = (v ?? '').trim();
  if (s === '') return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? Math.max(1, Math.round(n)) : fallback;
}

export function importHeaders(): string[] {
  return ['pertanyaan', 'opsi1', 'opsi2', 'opsi3', 'opsi4', 'opsi5', 'jawaban', 'bobot', 'level'];
}

export function soalToCsvRow(s: ImportSoal): (string | number)[] {
  const opsi = [...s.opsi];
  while (opsi.length < 5) opsi.push('');
  return [s.pertanyaan, ...opsi.slice(0, 5), String.fromCharCode(65 + s.jawaban), s.bobot, s.level];
}

function isHeaderRow(cells: string[]): boolean {
  return cells.some((c) => /^(pertanyaan|soal|question|jawaban|kunci|bobot|level|opsi\d+|type|jenis)$/i.test((c || '').trim()));
}

interface ColMap { type: number; pertanyaan: number; opsi: number[]; jawaban: number; bobot: number; level: number }

function mapColumns(header: string[]): ColMap {
  const norm = (s: string) => String(s).trim().toLowerCase().replace(/[_\s]+/g, '');
  const col: ColMap = { type: -1, pertanyaan: -1, opsi: [], jawaban: -1, bobot: -1, level: -1 };
  const opsiIdx: Record<number, number> = {};
  header.forEach((raw, i) => {
    const h = norm(raw);
    if (/^(type|jenis)$/.test(h)) col.type = i;
    else if (/^(pertanyaan|soal|question)$/.test(h)) col.pertanyaan = i;
    else if (/^opsi\d+$/.test(h) || /^pilihan\d+$/.test(h) || /^option\d+$/.test(h)) {
      opsiIdx[i] = Number((h.match(/\d+/) ?? ['0'])[0]);
      col.opsi.push(i);
    } else if (/^(jawaban|kunci|answer)$/.test(h)) col.jawaban = i;
    else if (/^(bobot|score|point|points)$/.test(h)) col.bobot = i;
    else if (/^(level|kesulitan|difficulty)$/.test(h)) col.level = i;
  });
  if (col.opsi.length > 0) col.opsi.sort((a, b) => (opsiIdx[a] ?? 0) - (opsiIdx[b] ?? 0));
  return col;
}

function cellsToSoal(c: string[], col?: ColMap): ImportSoal {
  let typeRaw = 'pg';
  let pertanyaan: string;
  let opsiRaw: string[];
  let jawaban = -1;
  let bobot = 10;
  let level: string | undefined;

  if (col && col.pertanyaan >= 0) {
    typeRaw = col.type >= 0 ? c[col.type] : 'pg';
    pertanyaan = c[col.pertanyaan] ?? '';
    opsiRaw = col.opsi.map((i) => (c[i] ?? '').trim());
    jawaban = normJawaban(col.jawaban >= 0 ? c[col.jawaban] : undefined);
    bobot = num(col.bobot >= 0 ? c[col.bobot] : undefined, 10);
    level = col.level >= 0 ? c[col.level] : undefined;
  } else {
    typeRaw = c[0] ?? 'pg';
    pertanyaan = c[1] ?? '';
    opsiRaw = c.slice(2, 7).map((o) => (o ?? '').trim());
    jawaban = normJawaban(c[7]);
    bobot = num(c[8], 10);
    level = c[9];
  }

  const item: ImportSoal = {
    pertanyaan, opsi: opsiRaw, jawaban, bobot, level: normLevel(level), error: undefined,
  };
  if (/essay|uraian/i.test(typeRaw)) item.error = ESSAY_ERROR;
  return item;
}

export function parseSoalCsv(text: string): ImportSoal[] {
  const rows = parseCsvSafe(text).filter((r) => r.length > 0);
  if (rows.length === 0) return [];
  let col: ColMap | undefined;
  if (isHeaderRow(rows[0])) { col = mapColumns(rows[0]); rows.shift(); }
  return rows.map((r) => {
    const s = cellsToSoal(r, col);
    if (!s.error) s.error = validateItem(s.pertanyaan, s.opsi, s.jawaban, s.bobot);
    return s;
  });
}

function parseCsvSafe(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const OPTION_RE = /^([A-Ea-e])[.)-]\s*(.+)$/;

interface Block {
  pertanyaan?: string;
  opsi: string[];
  jawaban?: string;
  bobot?: string;
  level?: string;
  type?: string;
}

export function parseBlockText(text: string): ImportSoal[] {
  const blocks = splitBlocks(text);
  const result: ImportSoal[] = [];
  for (const rawBlock of blocks) {
    const b = parseBlock(rawBlock);
    if (!b.pertanyaan) continue;
    const bobot = num(b.bobot, 10);
    const level = normLevel(b.level);
    const jawaban = b.opsi.length > 0 ? normJawaban(b.jawaban) : -1;
    const item: ImportSoal = { pertanyaan: b.pertanyaan, opsi: b.opsi, jawaban, bobot, level, error: undefined };
    if (b.type && /essay|uraian/i.test(b.type)) item.error = ESSAY_ERROR;
    else if (!item.error) item.error = validateItem(b.pertanyaan, b.opsi, jawaban, bobot);
    result.push(item);
  }
  return result;
}

function splitBlocks(text: string): string[] {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let cur: string[] = [];
  let lastEmpty = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-=*_]{3,}$/.test(trimmed) && cur.length > 0) { blocks.push(cur.join('\n')); cur = []; lastEmpty = false; continue; }
    if (trimmed === '') {
      if (cur.length > 0 && !lastEmpty) { blocks.push(cur.join('\n')); cur = []; lastEmpty = true; }
      continue;
    }
    lastEmpty = false;
    cur.push(line);
  }
  if (cur.length > 0) blocks.push(cur.join('\n'));
  return blocks;
}

function parseBlock(block: string): Block {
  const lines = block.split('\n');
  const b: Block = { opsi: [] };
  const pending: string[] = [];

  const flushPertanyaan = () => {
    if (pending.length > 0) {
      const q = pending.join(' ').trim();
      if (q && !b.pertanyaan) b.pertanyaan = q;
    }
    pending.length = 0;
  };

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    const opt = t.match(OPTION_RE);
    if (opt) { b.opsi.push(opt[2].trim()); flushPertanyaan(); continue; }

    let m = t.match(/^(jenis|type)\s*[:=]\s*(.+)$/i);
    if (m) { b.type = m[2].trim(); flushPertanyaan(); continue; }

    m = t.match(/^(jawaban|kunci)\s*[:=]\s*(.+)$/i);
    if (m) { b.jawaban = m[2].trim(); flushPertanyaan(); continue; }

    m = t.match(/^bobot\s*[:=]\s*(.+)$/i);
    if (m) { b.bobot = m[1].trim(); flushPertanyaan(); continue; }

    m = t.match(/^level\s*[:=]\s*(.+)$/i);
    if (m) { b.level = m[1].trim(); flushPertanyaan(); continue; }

    m = t.match(/^(soal|pertanyaan)\s*[:=]\s*(.+)$/i);
    if (m) { flushPertanyaan(); pending.push(m[2].trim()); continue; }

    if (b.opsi.length > 0) { flushPertanyaan(); b.pertanyaan = (b.pertanyaan ? b.pertanyaan + ' ' : '') + t; continue; }

    pending.push(t);
  }
  flushPertanyaan();
  return b;
}

export function validateItem(pertanyaan: string, opsi: string[], jawaban: number, bobot: number): string | undefined {
  if (!pertanyaan) return 'Pertanyaan kosong';
  if (opsi.length !== 5) return 'Wajib tepat 5 opsi jawaban (A-E)';
  if (opsi.some((o) => !o)) return 'Ada opsi jawaban yang kosong';
  if (jawaban < 0 || jawaban > 4) return 'Kunci jawaban wajib dipilih (A-E)';
  if (bobot <= 0) return 'Bobot harus > 0';
  return undefined;
}

export function autoParse(text: string): ImportSoal[] {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];
  const firstLine = trimmed.split(/\r?\n/)[0];
  if (firstLine.includes(',') && firstLine.split(',').length >= 3) return parseSoalCsv(trimmed);
  return parseBlockText(trimmed);
}
