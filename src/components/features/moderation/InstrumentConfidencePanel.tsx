import { AlertCircle, Music2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InstrumentConfidenceBar from '@/components/common/InstrumentConfidenceBar';
import { CONFIDENCE_THRESHOLDS } from '@/features/upload/constants/instrumentConfidence';
import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';

type InstrumentConfidencePanelProps = {
  recordingId: string;
  enabled?: boolean;
};

export default function InstrumentConfidencePanel({
  recordingId,
  enabled = true,
}: InstrumentConfidencePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InstrumentDetectionResult | null>(null);

  useEffect(() => {
    if (!enabled || !recordingId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    void instrumentDetectionService
      .analyzeRecording(recordingId)
      .then((data) => {
        if (!mounted) return;
        setResult(data);
      })
      .catch(() => {
        if (!mounted) return;
        setError('Không thể tải confidence nhạc cụ từ AI.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled, recordingId]);

  const sortedInstruments = useMemo(
    () =>
      [...(result?.instruments ?? [])].sort((a, b) => {
        const ca = a.confidence !== null && Number.isFinite(a.confidence) ? a.confidence : -1;
        const cb = b.confidence !== null && Number.isFinite(b.confidence) ? b.confidence : -1;
        return cb - ca;
      }),
    [result],
  );

  if (!enabled || !recordingId || !instrumentDetectionFlags.confidenceEnabled) return null;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
        <Music2 className="h-4 w-4 text-primary-600" />
        AI Instrument Detection
      </h3>

      {loading && (
        <p className="text-sm text-neutral-600" role="status">
          Đang phân tích nhạc cụ...
        </p>
      )}

      {!loading && error && (
        <p className="flex items-center gap-1 text-sm text-amber-700" role="status">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {!loading && !error && sortedInstruments.length === 0 && (
        <p className="text-sm text-neutral-600">Không có dữ liệu confidence nhạc cụ.</p>
      )}

      {!loading && !error && sortedInstruments.length > 0 && (
        <div className="space-y-2">
          {sortedInstruments.map((item) => (
            <div key={item.id ?? item.name} className="rounded-xl bg-neutral-50 px-3 py-2">
              <InstrumentConfidenceBar name={item.name} confidence={item.confidence} />
            </div>
          ))}
          {sortedInstruments.every(
            (item) =>
              item.confidence === null ||
              !Number.isFinite(item.confidence) ||
              item.confidence < CONFIDENCE_THRESHOLDS.MEDIUM,
          ) && (
            <p className="text-xs text-amber-700">
              AI không tự tin về nhạc cụ - vui lòng kiểm tra thủ công.
            </p>
          )}
          {result?.audio_info && (
            <p className="text-xs text-neutral-500">
              Phân tích: {Math.round(result.audio_info.analyzed_duration)}s / {result.audio_info.num_frames}{' '}
              frames / {result.audio_info.sample_rate} Hz
            </p>
          )}
        </div>
      )}
    </div>
  );
}
