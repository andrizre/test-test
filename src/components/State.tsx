import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

export function Loading({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
      <Loader2 size={22} className="animate-spin text-brand-500" />
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
        <AlertCircle size={22} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">Gagal memuat data</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">{message}</p>
      </div>
      {onRetry ? (
        <Button size="sm" variant="secondary" onClick={onRetry}>Coba Lagi</Button>
      ) : null}
    </div>
  );
}
