import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, ApiError } from '../api';

export interface UseQueryResult<T> {
  data: T | null;
  error: ApiError | Error | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Tiny data-fetch hook. Mounts -> fetches; refetch() re-runs. Cancels in-flight
 * results on unmount via a mounted ref guard.
 */
export function useQuery<T>(
  path: string | null,
  deps: ReadonlyArray<unknown> = [],
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [loading, setLoading] = useState<boolean>(path !== null);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    if (path === null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<T>(path);
      if (!mounted.current) return;
      setData(result);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mounted.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  useEffect(() => {
    mounted.current = true;
    void run();
    return () => {
      mounted.current = false;
    };
  }, [run]);

  return { data, error, loading, refetch: run };
}
