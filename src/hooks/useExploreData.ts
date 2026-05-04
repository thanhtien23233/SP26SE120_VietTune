import { useEffect, useState } from 'react';

import type { ExploreSearchMode } from '@/components/features/ExploreSearchHeader';
import {
  loadExploreRecordings,
  isExploreRequestAborted,
  type ExploreDataSource,
} from '@/features/explore/utils/exploreRecordingsLoad';
import type { Recording } from '@/types';
import type { SearchFilters } from '@/types';

type Params = {
  currentPage: number;
  exploreMode: ExploreSearchMode;
  filters: SearchFilters;
  sqFromUrl: string;
  isAuthenticated: boolean;
};

export function useExploreData({
  currentPage,
  exploreMode,
  filters,
  sqFromUrl,
  isAuthenticated,
}: Params) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const logExploreTelemetry = (
      source: ExploreDataSource,
      count: number,
      extra?: Record<string, unknown>,
    ) => {
      if (!import.meta.env.DEV) return;
      console.warn('[ExplorePage]', {
        source,
        count,
        isAuthenticated,
        page: currentPage,
        filters,
        exploreMode,
        semanticQ: sqFromUrl,
        ...extra,
      });
    };

    void (async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const r = await loadExploreRecordings({
          signal: controller.signal,
          currentPage,
          exploreMode,
          filters,
          sqActive: sqFromUrl.trim(),
          isAuthenticated,
        });
        if (cancelled || controller.signal.aborted) return;
        setRecordings(r.recordings);
        setTotalResults(r.totalResults);
        setSearchError(r.fetchWarning ?? null);
        logExploreTelemetry(r.dataSource, r.recordings.length, {
          ...(r.fetchWarning ? { fallback: true } : {}),
        });
      } catch (e) {
        if (cancelled || controller.signal.aborted || isExploreRequestAborted(e)) return;
        console.error('Explore load failed:', e);
        setRecordings([]);
        setTotalResults(0);
        setSearchError('Không tải được dữ liệu. Bạn có thể thử lại sau.');
        logExploreTelemetry('empty', 0, { failed: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [currentPage, exploreMode, filters, isAuthenticated, sqFromUrl]);

  return { recordings, loading, totalResults, searchError, setSearchError };
}
