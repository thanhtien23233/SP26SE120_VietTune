import { AlertCircle, Bot, MapPin, Music2, Tag } from 'lucide-react';

import type { InstrumentDetectionResult, MetadataSuggestion } from '@/types/instrumentDetection';

type AIAnalysisSummaryCardProps = {
  analysisResult: InstrumentDetectionResult | null;
  metadataSuggestions: MetadataSuggestion[];
  metadataLoading: boolean;
  metadataError: string | null;
  contributorGenreLabel?: string;
  detectionLoading: boolean;
  detectionError: string | null;
};

export default function AIAnalysisSummaryCard({
  analysisResult,
  metadataSuggestions,
  metadataLoading,
  metadataError,
  contributorGenreLabel,
  detectionLoading,
  detectionError,
}: AIAnalysisSummaryCardProps) {
  const allInstrumentsSorted = [...(analysisResult?.instruments ?? [])].sort((a, b) => {
    const ca = a.confidence !== null && Number.isFinite(a.confidence) ? a.confidence : -1;
    const cb = b.confidence !== null && Number.isFinite(b.confidence) ? b.confidence : -1;
    return cb - ca;
  });
  const topInstruments = allInstrumentsSorted.slice(0, 4);

  const confidenceFinite = topInstruments.filter(
    (i) => i.confidence !== null && Number.isFinite(i.confidence),
  );
  const avgConfidence =
    confidenceFinite.length > 0
      ? confidenceFinite.reduce((s, i) => s + (i.confidence ?? 0), 0) / confidenceFinite.length
      : null;

  const regionSuggestion = metadataSuggestions.find((s) => s.field === 'region');
  const ethnicitySuggestion = metadataSuggestions.find((s) => s.field === 'ethnicity');
  const vocalStyleSuggestion = metadataSuggestions.find((s) => s.field === 'vocalStyle');

  const genreDisplay =
    (contributorGenreLabel && contributorGenreLabel.trim()) || vocalStyleSuggestion?.value || '—';

  if (
    !detectionLoading &&
    detectionError &&
    !(analysisResult?.instruments ?? []).length
  ) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-4 shadow-sm" role="status">
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{detectionError}</span>
        </p>
      </div>
    );
  }

  const noInstrumentDataAfterLoad =
    !detectionLoading && !detectionError && !(analysisResult?.instruments ?? []).length;

  if (!detectionLoading && noInstrumentDataAfterLoad) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm" role="status">
        <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-neutral-900">
          <Bot className="h-4 w-4 text-primary-600 shrink-0" aria-hidden />
          Tóm tắt AI
        </h3>
        <p className="text-sm text-neutral-600">
          Chưa có phân tích nhạc cụ từ AI cho bản thu này.
          {metadataLoading ? ' Đang ghép metadata…' : ''}
          {metadataError ? ` (${metadataError})` : ''}
        </p>
      </div>
    );
  }

  if (detectionLoading && !(analysisResult?.instruments?.length)) {
    return (
      <div
        className="animate-pulse rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm"
        role="status"
        aria-busy="true"
        aria-label="Đang tải kết quả phân tích AI"
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-md bg-neutral-200" />
          <div className="h-5 w-40 rounded-md bg-neutral-200" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="h-14 rounded-xl bg-neutral-100" />
          <div className="h-14 rounded-xl bg-neutral-100" />
          <div className="h-14 rounded-xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-900">
        <Bot className="h-4 w-4 shrink-0 text-primary-600" aria-hidden />
        Tóm tắt phân tích AI
      </h3>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 sm:col-span-2 lg:col-span-1 lg:row-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
            <Music2 className="h-3.5 w-3.5" aria-hidden />
            Nhạc cụ (độ tin cậy)
          </p>
          <ul className="space-y-1.5 text-sm">
            {topInstruments.map((inst) => (
              <li
                key={inst.id ?? inst.name}
                className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2.5 py-1"
              >
                <span className="truncate font-medium text-neutral-800">{inst.name}</span>
                <span className="shrink-0 tabular-nums text-neutral-600">
                  {inst.confidence !== null && Number.isFinite(inst.confidence)
                    ? `${Math.round(inst.confidence * 100)}%`
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-500">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Khu vực gợi ý
          </p>
          <p className="text-sm font-medium text-neutral-900">{regionSuggestion?.value ?? '—'}</p>
          {metadataLoading && regionSuggestion?.value === undefined ? (
            <p className="text-xs text-neutral-500">Đang tải gợi ý metadata…</p>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-500">
            <Tag className="h-3.5 w-3.5" aria-hidden />
            Dân tộc / thể hiện
          </p>
          <p className="text-sm font-medium text-neutral-900">{ethnicitySuggestion?.value ?? '—'}</p>
          {genreDisplay !== '—' ? (
            <p className="mt-1 truncate text-xs text-neutral-500" title={genreDisplay}>
              Thể loại / điệu: {genreDisplay}
            </p>
          ) : null}
        </div>
      </div>

      {avgConfidence !== null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-neutral-500">Độ tin cậy trung bình (nhạc cụ đã có %)</span>
            <span className="font-semibold text-neutral-800">{Math.round(avgConfidence * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${Math.min(100, avgConfidence * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {analysisResult?.audio_info && (
        <p className="mt-3 border-t border-neutral-100 pt-3 text-[11px] text-neutral-500">
          Âm học thô: ~
          {Math.round(analysisResult.audio_info.analyzed_duration)}s • {analysisResult.audio_info.num_frames} khung •{' '}
          {analysisResult.audio_info.sample_rate} Hz
        </p>
      )}
    </div>
  );
}
