import { useCallback, useEffect, useState } from 'react';

export function useData<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(fetcher, deps);

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    fn()
      .then((d) => { setData(d); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, [fn]);

  useEffect(() => { reload(); }, [reload]);

  return { data, loading, error, reload, setData };
}

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run };
}
