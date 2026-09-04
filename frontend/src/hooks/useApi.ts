import { useState, useEffect, useCallback } from "react";

interface RefetchOptions {
  // Defaults to true: pull-to-refresh and in-place actions (mark as read,
  // accept invite...) already give their own feedback, so keep the stale
  // data on screen instead of flashing back to a skeleton. Screens pass
  // `keepData: false` from their focus effect so returning to a screen with
  // outdated data (e.g. changed a filter elsewhere, navigated back) shows
  // the skeleton immediately instead of the stale content first.
  keepData?: boolean;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: (opts?: RefetchOptions) => Promise<void>;
}

export function useApi<T>(fetcher: () => Promise<T>, deps: any[] = []): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: RefetchOptions) => {
    setLoading(true);
    setError(null);
    if (opts?.keepData === false) setData(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
