import { useCallback, useEffect, useMemo, useState } from 'react';

import { annotationApi } from '@/services/annotationApi';
import type { AnnotationDto } from '@/types/annotation';
import { toastApiError } from '@/uiToast/toastApiError';

export function useAnnotations(recordingId: string) {
  const [annotations, setAnnotations] = useState<AnnotationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!recordingId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await annotationApi.getByRecordingId(recordingId);
      setAnnotations(rows);
    } catch (e) {
      setError('Không tải được danh sách chú thích.');
      toastApiError(e, 'Không tải được danh sách chú thích.');
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sortedAnnotations = useMemo(
    () =>
      [...annotations].sort((a, b) => {
        const aT = a.timestampStart ?? Number.MAX_SAFE_INTEGER;
        const bT = b.timestampStart ?? Number.MAX_SAFE_INTEGER;
        if (aT !== bT) return aT - bT;
        return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      }),
    [annotations],
  );

  return { annotations, sortedAnnotations, loading, error, reload };
}
