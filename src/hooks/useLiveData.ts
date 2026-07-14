import { useCallback, useEffect, useRef, useState } from "react";

interface UseLiveDataOptions {
  pollIntervalMs?: number;
}

interface UseLiveDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastSyncedAt: number | null;
  refresh: () => void;
}

/**
 * Generic async data hook that treats `fetcher` as a real network call:
 * tracks loading/error state, supports manual refresh, and can poll on an
 * interval to keep the UI feeling "live" — the same shape you'd use
 * against any production REST endpoint.
 */
export function useLiveData<T>(
  fetcher: () => Promise<T>,
  options: UseLiveDataOptions = {}
): UseLiveDataResult<T> {
  const { pollIntervalMs } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setLastSyncedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the TripTide data service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!pollIntervalMs) return;
    const id = window.setInterval(load, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [load, pollIntervalMs]);

  return { data, loading, error, lastSyncedAt, refresh: load };
}