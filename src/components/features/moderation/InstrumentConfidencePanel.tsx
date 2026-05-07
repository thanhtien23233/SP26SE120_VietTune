import { AlertCircle, Info, Music2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InstrumentConfidenceBar from '@/components/common/InstrumentConfidenceBar';
import {
  AIAnalysisState,
  AI_STATE_MESSAGES_VI,
  deriveAIAnalysisState,
} from '@/features/moderation/constants/aiAnalysisState';
import { CONFIDENCE_THRESHOLDS } from '@/features/upload/constants/instrumentConfidence';
import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';
import { getHttpStatus } from '@/utils/httpError';

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
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [result, setResult] = useState<InstrumentDetectionResult | null>(null);

  useEffect(() => {
    if (!enabled || !recordingId) return;

    let mounted = true;
    setLoading(true);
    setError(null);
    setHttpStatus(null);
    void instrumentDetectionService
      .analyzeRecording(recordingId)
      .then((data) => {
        if (!mounted) return;
        setResult(data);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const status = getHttpStatus(err) ?? null;
        setHttpStatus(status);
        setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled, recordingId]);

  const aiState = deriveAIAnalysisState({ loading, error, result, httpStatus });

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

      {aiState === AIAnalysisState.LOADING && (
        <p className="text-sm text-neutral-600" role="status">
          {AI_STATE_MESSAGES_VI[AIAnalysisState.LOADING].confidence}
        </p>
      )}

      {aiState === AIAnalysisState.NOT_AVAILABLE && (
        <div className="flex items-start gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5" role="status">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
          <p className="text-sm text-neutral-600">
            {AI_STATE_MESSAGES_VI[AIAnalysisState.NOT_AVAILABLE].confidence}
          </p>
        </div>
      )}

      {aiState === AIAnalysisState.FAILED && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/60 px-3 py-2.5" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">
            {AI_STATE_MESSAGES_VI[AIAnalysisState.FAILED].confidence}
          </p>
        </div>
      )}

      {aiState === AIAnalysisState.READY && sortedInstruments.length > 0 && (
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
