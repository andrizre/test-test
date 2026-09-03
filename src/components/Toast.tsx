import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast { id: number; msg: string; tone: Tone }

const Ctx = createContext<{ show: (msg: string, tone?: Tone) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const show = useCallback((msg: string, tone: Tone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, msg, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  const icon = (t: Tone) => {
    if (t === 'success') return <CheckCircle2 size={18} className="text-emerald-500" />;
    if (t === 'error') return <XCircle size={18} className="text-rose-500" />;
    return <AlertTriangle size={18} className="text-amber-500" />;
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg"
          >
            {icon(t.tone)}
            <span className="text-sm text-slate-700">{t.msg}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}
