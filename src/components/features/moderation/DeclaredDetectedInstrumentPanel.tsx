import { AlertCircle, CheckCircle2, GitCompareArrows, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { instrumentDetectionFlags, instrumentDetectionService } from '@/services/instrumentDetectionService';
import type { InstrumentDetectionResult } from '@/types/instrumentDetection';
import { compareDeclaredDetectedInstruments } from '@/utils/instrumentDeclaredDetectedCompare';

type DeclaredDetectedInstrumentPanelProps = {
  recordingId: string;
  declaredInstruments: string[];
  enabled?: boolean;
};

export default function DeclaredDetectedInstrumentPanel({
  recordingId,
  declaredInstruments,
  enabled = true,
}: DeclaredDetectedInstrumentPanelProps) {
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
        setError('Không thể tải dữ liệu đối chiếu nhạc cụ từ AI.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [enabled, recordingId]);

  const comparison = useMemo(
    () => compareDeclaredDetectedInstruments(declaredInstruments, result?.instruments ?? []),
    [declaredInstruments, result],
  );

  if (!enabled || !recordingId || !instrumentDetectionFlags.confidenceEnabled) return null;

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
        <GitCompareArrows className="h-4 w-4 text-primary-600" />
        Đối chiếu nhạc cụ: Khai báo vs AI phát hiện
      </h3>

      {loading && (
        <p className="text-sm text-neutral-600" role="status">
          Đang đối chiếu nhạc cụ...
        </p>
      )}

      {!loading && error && (
        <p className="flex items-center gap-1 text-sm text-amber-700" role="status">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {!loading && !error && comparison.rows.length === 0 && (
        <p className="text-sm text-neutral-600">Không có nhạc cụ khai báo để đối chiếu.</p>
      )}

      {!loading && !error && comparison.rows.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-neutral-500">
            <span>Contributor khai báo</span>
            <span>AI phát hiện</span>
          </div>

          {comparison.rows.map((row) => (
            <div
              key={row.declared}
              className={`grid grid-cols-2 gap-2 rounded-xl border px-3 py-2 text-sm ${
                row.matched ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40'
              }`}
            >
              <span className="font-medium text-neutral-800">{row.declared}</span>
              <span className="flex items-center gap-2">
                {row.matched ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-neutral-800">
                      {row.detected}{' '}
                      {row.confidence !== null
                        ? `(${Math.round(row.confidence * 100)}%)`
                        : '(Không rõ độ tin cậy)'}
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700">Không tìm thấy</span>
                  </>
                )}
              </span>
            </div>
          ))}

          {comparison.unmatchedDetected.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800">AI phát hiện thêm (chưa được contributor khai báo)</p>
              <p className="mt-1 text-sm text-amber-900">
                {comparison.unmatchedDetected
                  .map((d) =>
                    d.confidence !== null
                      ? `${d.name} (${Math.round(d.confidence * 100)}%)`
                      : `${d.name} (Không rõ độ tin cậy)`,
                  )
                  .join(', ')}
              </p>
            </div>
          )}

          {comparison.mismatchCount > 0 && (
            <p className="text-xs text-amber-700">
              Có {comparison.mismatchCount} điểm lệch khớp, vui lòng expert xác minh thủ công trước khi phê duyệt.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
