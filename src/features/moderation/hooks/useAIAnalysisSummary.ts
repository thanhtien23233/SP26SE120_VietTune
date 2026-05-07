import { useEffect, useState } from 'react';

import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';

/**
 * Mirrors `InstrumentConfidencePanel` data source (`analyzeRecording`), which is cached per id in-memory.
 */
export function useAIAnalysisSummary(recordingId: string | undefined, enabled: boolean) {
  const [data, setData] = useState<InstrumentDetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !recordingId || !instrumentDetectionFlags.confidenceEnabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setData(null);
    setLoading(true);
    setError(null);
    void instrumentDetectionService
      .analyzeRecording(recordingId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Không thể tải kết quả phân tích AI.');
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, recordingId]);

  return { data, loading, error };
}
