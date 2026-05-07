import { useEffect, useState } from 'react';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { fetchRelatedSubmissions } from '@/services/expertModerationApi';

type SimilarRecordingsState = {
  data: LocalRecordingMini[];
  loading: boolean;
  error: string | null;
};

/**
 * Fetches related submissions for the selected moderation row.
 * Keeps response lightweight and resilient (returns [] on unsupported backend shapes).
 */
export function useSimilarRecordings(submissionId?: string, enabled = true): SimilarRecordingsState {
  const [data, setData] = useState<LocalRecordingMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !submissionId) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setData([]);
    setLoading(true);
    setError(null);

    void fetchRelatedSubmissions(submissionId)
      .then((rows) => {
        if (cancelled) return;
        const normalized = rows
          .filter((row) => row.id && row.id !== submissionId)
          .slice(0, 6) as LocalRecordingMini[];
        setData(normalized);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Không thể tải bản thu tương tự');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, submissionId]);

  return { data, loading, error };
}
