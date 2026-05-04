import { useCallback, useEffect, useState } from 'react';

import { submissionService, type Submission } from '@/services/submissionService';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Paginated list of the current user's submissions with optional client-side status filter.
 */
export function useContributionsData(userId: string | undefined) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState<number | 'ALL'>('ALL');
  const pageSize = DEFAULT_PAGE_SIZE;

  const loadSubmissions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await submissionService.getMySubmissions(userId, page, pageSize);

      if (res?.isSuccess && Array.isArray(res.data)) {
        let filteredData = res.data;

        if (activeStatusTab !== 'ALL') {
          filteredData = res.data.filter((s) => s.status === activeStatusTab);
        }

        filteredData = [...filteredData].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );

        setSubmissions(filteredData);
        setHasMore(res.data.length === pageSize);
      } else {
        setSubmissions([]);
        setHasMore(false);
      }
    } catch (err: unknown) {
      console.error('Failed to load submissions:', err);
      setError('Không thể tải danh sách đóng góp. Vui lòng thử lại.');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [userId, page, activeStatusTab, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [activeStatusTab]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  return {
    submissions,
    setSubmissions,
    loading,
    error,
    page,
    setPage,
    hasMore,
    activeStatusTab,
    setActiveStatusTab,
    pageSize,
    loadSubmissions,
  };
}
