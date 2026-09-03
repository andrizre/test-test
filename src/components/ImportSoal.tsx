import { useMemo, useRef, useState } from 'react';
import { FileUp, ClipboardPaste, FileDown, CheckCircle2, XCircle } from 'lucide-react';
import { api, type MapelDTO } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Button, Field, Select } from '@/components/ui';
import { parseSoalCsv, parseBlockText, importHeaders, type ImportSoal } from '@/lib/importSoal';
import { downloadCsv } from '@/lib/csv';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  mapelList: MapelDTO[];
  guruId: string;
}

const SAMPLE_CSV = `pertanyaan,opsi1,opsi2,opsi3,opsi4,opsi5,jawaban,bobot,level
"Apa ibu kota Indonesia?",Jakarta,Bandung,Surabaya,Medan,Denpasar,A,10,mudah
"Hasil dari 12 x 8 adalah...",84,88,96,104,108,C,10,mudah`;

const SAMPLE_TEXT = `Soal: Apa ibu kota Indonesia?
A. Jakarta
B. Bandung
C. Surabaya
D. Medan
E. Denpasar
Jawaban: A
Bobot: 10
Level: mudah`;

export function ImportSoalModal({ open, onClose, onDone, mapelList, guruId }: Props) {
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'csv' | 'teks'>('csv');
  const [mapelId, setMapelId] = useState(mapelList[0]?.id ?? '');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  const list = useMemo<ImportSoal[]>(() => {
    if (!text.trim()) return [];
    return tab === 'csv' ? parseSoalCsv(text) : parseBlockText(text);
  }, [text, tab]);

  const valid = list.filter((s) => !s.error);
  const invalid = list.filter((s) => !!s.error);

  const readFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result ?? '')); setFileName(f.name); setTab('csv'); };
    reader.readAsText(f, 'utf-8');
  };

  const downloadTemplate = () => {
    downloadCsv('template-soal-ujian.csv', SAMPLE_CSV + '\r\n');
  };

  const doImport = async () => {
    if (!mapelId) { show('Pilih mata pelajaran terlebih dahulu', 'error'); return; }
    if (valid.length === 0) { show('Tidak ada soal valid untuk diimpor', 'error'); return; }
    setImporting(true);
    try {
      const res = await api.importSoal({
        mapelId, guruId,
        list: valid.map((s) => ({ pertanyaan: s.pertanyaan, opsi: s.opsi, jawaban: s.jawaban, bobot: s.bobot, level: s.level })),
      });
      show(res.skipped > 0
        ? `${res.inserted} soal diimpor, ${res.skipped} dilewati`
        : `${res.inserted} soal berhasil diimpor`);
      setText(''); setFileName('');
      onDone();
      onClose();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Gagal mengimpor soal', 'error');
    } finally { setImporting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Impor Soal dari CSV / Teks" size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
          <Button onClick={() => void doImport()} disabled={importing || valid.length === 0}>
            {importing ? 'Mengimpor…' : `Impor ${valid.length} Soal`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Mata Pelajaran Tujuan" htmlFor="im-mapel">
            <Select id="im-mapel" value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">— Pilih Mapel —</option>
              {mapelList.map((m) => <option key={m.id} value={m.id}>{m.nama}</option>)}
            </Select>
          </Field>
          <div className="flex items-end pb-1">
            <Button size="sm" variant="ghost" onClick={downloadTemplate}>
              <FileDown size={14} />Template CSV
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab('csv')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${tab === 'csv' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            <FileUp size={14} />File / CSV
          </button>
          <button type="button" onClick={() => setTab('teks')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${tab === 'teks' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            <ClipboardPaste size={14} />Paste Teks
          </button>
        </div>

        {tab === 'csv' ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4">
              <button
                type="button"
                className="flex w-full cursor-pointer flex-col items-center gap-1.5 text-slate-500 hover:text-brand-600"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={22} />
                <span className="text-xs font-medium">{fileName || 'Klik untuk pilih file .csv / .txt'}</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }}
              />
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SAMPLE_CSV}
              className="w-full min-h-32 rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
            />
          </>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={SAMPLE_TEXT}
            className="w-full min-h-40 rounded-lg border border-slate-300 p-3 font-mono text-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
          />
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Terdeteksi <strong className="text-emerald-600">{valid.length}</strong> valid
            {invalid.length > 0 ? <>, <strong className="text-rose-600">{invalid.length}</strong> bermasalah</> : null}
          </p>
          {list.length > 0 && tab === 'teks' ? (
            <button type="button" onClick={() => setText('')} className="cursor-pointer text-xs text-slate-400 hover:text-rose-600">Bersihkan</button>
          ) : null}
        </div>

        {list.length > 0 ? (
          <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[11px] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">#</th>
                  <th className="px-3 py-2 font-semibold">Pertanyaan</th>
                  <th className="px-3 py-2 font-semibold">Opsi</th>
                  <th className="px-3 py-2 font-semibold">Kunci</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((s, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="max-w-40 truncate px-3 py-2 text-slate-700">{s.pertanyaan}</td>
                    <td className="px-3 py-2 text-slate-500">{s.opsi.length}/5</td>
                    <td className="px-3 py-2 text-slate-500">{s.jawaban >= 0 && s.jawaban <= 4 ? String.fromCharCode(65 + s.jawaban) : '—'}</td>
                    <td className="px-3 py-2">
                      {s.error ? (
                        <span className="flex items-center gap-1 text-rose-600"><XCircle size={13} />{s.error}</span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} />OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-500">
            <p className="mb-2 font-medium">Format yang didukung (pilihan ganda A–E):</p>
            <p className="font-mono text-[11px]">{tab === 'csv' ? `Kolom: ${importHeaders().join(', ')}` : 'Blok per soal (Soal / A-E / Jawaban / Bobot / Level)'}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
