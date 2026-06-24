import { useEffect, useState, useCallback } from 'react';
import { fetchSirSummary, fetchAcBreakdown, fetchBoothBreakdown, fetchSirTrend } from '../api/sir';
import {
  USE_MOCKS,
  mockSirSummary,
  mockAcBreakdown,
  mockBoothBreakdown,
  mockSirTrend,
} from '../api/mockData';

function useAsync(fetcher, deps, fallback) {
  const [state, setState] = useState({ data: null, isLoading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetcher()
      .then((data) => setState({ data, isLoading: false, error: null }))
      .catch((error) => {
        if (fallback) {
          setState({ data: fallback(), isLoading: false, error: null });
          return;
        }
        setState({ data: null, isLoading: false, error });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}

export function useSirSummary(scope, acId) {
  return useAsync(
    () => (USE_MOCKS ? Promise.resolve(mockSirSummary(scope, acId)) : fetchSirSummary({ scope, ac_id: acId })),
    [scope, acId],
    USE_MOCKS ? () => mockSirSummary(scope, acId) : null
  );
}

export function useAcBreakdown() {
  return useAsync(
    () => (USE_MOCKS ? Promise.resolve(mockAcBreakdown()) : fetchAcBreakdown()),
    [],
    USE_MOCKS ? () => mockAcBreakdown() : null
  );
}

export function useBoothBreakdown(acId) {
  return useAsync(
    () => (USE_MOCKS ? Promise.resolve(mockBoothBreakdown(acId)) : fetchBoothBreakdown(acId)),
    [acId],
    USE_MOCKS ? () => mockBoothBreakdown(acId) : null
  );
}

export function useSirTrend(scope, acId, days = 14) {
  return useAsync(
    () => (USE_MOCKS ? Promise.resolve(mockSirTrend(days)) : fetchSirTrend({ scope, ac_id: acId, days })),
    [scope, acId, days],
    USE_MOCKS ? () => mockSirTrend(days) : null
  );
}
