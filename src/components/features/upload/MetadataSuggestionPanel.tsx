import { AlertCircle, Check, Info } from 'lucide-react';
import { useCallback, useState } from 'react';

import InstrumentConfidenceBar from '@/components/common/InstrumentConfidenceBar';
import {
  AIAnalysisState,
  AI_STATE_MESSAGES_VI,
} from '@/features/moderation/constants/aiAnalysisState';
import { instrumentDetectionFlags } from '@/services/instrumentDetectionService';
import type { MetadataSuggestion, MetadataSuggestionField } from '@/types/instrumentDetection';
import { groupMetadataSuggestionsForAdvisory, normalizeInstrumentMatchKey } from '@/utils/instrumentMetadataMapper';

type MetadataSuggestionPanelProps = {
  suggestions: MetadataSuggestion[];
  readOnly?: boolean;
  loading?: boolean;
  error?: string | null;
  httpStatus?: number | null;
  disabledFields?: Partial<Record<MetadataSuggestionField, boolean>>;
  onApply?: (field: MetadataSuggestionField, value: string) => void;
};

const FIELD_LABELS: Record<MetadataSuggestionField, string> = {
  ethnicity: 'Dân tộc',
  region: 'Khu vực',
  vocalStyle: 'Lối hát / Thể loại',
  eventType: 'Loại sự kiện',
  musicalScale: 'Âm giai',
};

function ApplyButton({
  field,
  value,
  disabled,
  onApply,
}: {
  field: MetadataSuggestionField;
  value: string;
  disabled: boolean;
  onApply: (field: MetadataSuggestionField, value: string) => void;
}) {
  const [applied, setApplied] = useState(false);

  const handleClick = useCallback(() => {
    onApply(field, value);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  }, [field, value, onApply]);

  if (applied) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <Check className="h-3 w-3" strokeWidth={3} />
        Đã áp dụng
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
    >
      Áp dụng
    </button>
  );
}

export default function MetadataSuggestionPanel({
  suggestions,
  readOnly = false,
  loading = false,
  error = null,
  httpStatus = null,
  disabledFields,
  onApply,
}: MetadataSuggestionPanelProps) {
  if (!instrumentDetectionFlags.confidenceEnabled) return null;

  const isNotAvailable =
    !loading && !!error && (httpStatus === 404 || httpStatus === 400);
  const isFailed = !loading && !!error && !isNotAvailable;
  const metadataAiState: AIAnalysisState = loading
    ? AIAnalysisState.LOADING
    : isNotAvailable
      ? AIAnalysisState.NOT_AVAILABLE
      : isFailed
        ? AIAnalysisState.FAILED
        : suggestions.length === 0
          ? AIAnalysisState.NOT_AVAILABLE
          : AIAnalysisState.READY;

  const grouped = suggestions.reduce<Record<MetadataSuggestionField, MetadataSuggestion[]>>(
    (acc, row) => {
      acc[row.field].push(row);
      return acc;
    },
    { ethnicity: [], region: [], vocalStyle: [], eventType: [], musicalScale: [] },
  );
  const advisoryGroups = groupMetadataSuggestionsForAdvisory(suggestions);

  const advisoryByLegacyField = new Map<MetadataSuggestionField, (typeof advisoryGroups)[number]>();
  for (const group of advisoryGroups) {
    if (group.field === 'region') advisoryByLegacyField.set('region', group);
    if (group.field === 'ethnicGroup') advisoryByLegacyField.set('ethnicity', group);
    if (group.field === 'vocalStyle') advisoryByLegacyField.set('vocalStyle', group);
    if (group.field === 'eventType') advisoryByLegacyField.set('eventType', group);
    if (group.field === 'musicalScale') advisoryByLegacyField.set('musicalScale', group);
  }

  function pickBestRowForValue(
    rows: MetadataSuggestion[],
    value: string | null,
  ): MetadataSuggestion | null {
    if (!value) return null;
    const key = normalizeInstrumentMatchKey(value);
    const byExact = rows
      .filter((row) => normalizeInstrumentMatchKey(row.value) === key)
      .sort((a, b) => b.confidence - a.confidence);
    if (byExact.length > 0) return byExact[0];

    const byPrefix = rows
      .filter((row) => {
        const rk = normalizeInstrumentMatchKey(row.value);
        return key.startsWith(`${rk} `) || rk.startsWith(`${key} `);
      })
      .sort((a, b) => b.confidence - a.confidence);
    return byPrefix[0] ?? null;
  }

  function resolveTopValue(field: MetadataSuggestionField, rows: MetadataSuggestion[]): string | null {
    const advisory = advisoryByLegacyField.get(field);
    if (advisory && advisory.candidates.length > 0) {
      const topCandidate = advisory.candidates[0].value;
      if (pickBestRowForValue(rows, topCandidate)) return topCandidate;
    }
    if (rows.length > 0) return rows[0].value;
    return null;
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="mb-2 text-xs font-semibold text-neutral-700">Gợi ý metadata từ AI nhạc cụ</p>

      {metadataAiState === AIAnalysisState.LOADING && (
        <p className="text-xs text-neutral-600">{AI_STATE_MESSAGES_VI[AIAnalysisState.LOADING].metadata}</p>
      )}

      {metadataAiState === AIAnalysisState.NOT_AVAILABLE && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 px-2.5 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" />
          <p className="text-xs text-neutral-600">
            {AI_STATE_MESSAGES_VI[AIAnalysisState.NOT_AVAILABLE].metadata}
          </p>
        </div>
      )}

      {metadataAiState === AIAnalysisState.FAILED && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/60 px-2.5 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
          <p className="text-xs text-red-700">
            {AI_STATE_MESSAGES_VI[AIAnalysisState.FAILED].metadata}
          </p>
        </div>
      )}

      {metadataAiState === AIAnalysisState.READY && (
        <div className="space-y-3">
          {(Object.keys(FIELD_LABELS) as MetadataSuggestionField[]).map((field) => {
            const rows = grouped[field];
            if (rows.length === 0) return null;
            const advisory = advisoryByLegacyField.get(field);
            const topValue = resolveTopValue(field, rows);
            const topRow = pickBestRowForValue(rows, topValue);

            return (
              <div key={field} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-neutral-700">{FIELD_LABELS[field]}</p>
                  {advisory?.conflictDetected && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      Nhiều nguồn ảnh hưởng
                    </span>
                  )}
                  {advisory?.requiresExpert && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      Cần chuyên gia xác minh
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{topValue ?? rows[0].value}</p>
                      {topRow && <p className="text-xs text-neutral-500">Nguồn: {topRow.sourceInstrument}</p>}
                    </div>
                    {!readOnly && onApply && topValue && (
                      <ApplyButton
                        field={field}
                        value={topValue}
                        disabled={!!disabledFields?.[field]}
                        onApply={onApply}
                      />
                    )}
                  </div>
                  {topRow && (
                    <div className="mt-1">
                      <InstrumentConfidenceBar
                        name={topRow.sourceInstrument}
                        confidence={topRow.confidence}
                        compact
                      />
                    </div>
                  )}
                  {advisory && advisory.candidates.length > 1 && (
                    <div className="mt-2 border-t border-neutral-100 pt-2">
                      <p className="text-[11px] font-medium text-neutral-500">Các gợi ý khác</p>
                      <ul className="mt-1 space-y-1">
                        {advisory.candidates.slice(1, 3).map((candidate) => (
                          <li
                            key={`${field}-alt-${candidate.value}`}
                            className="flex items-center gap-2 text-xs text-neutral-600"
                          >
                            <span className="text-primary-700">•</span>
                            <span>{candidate.label}</span>
                            <span className="font-semibold text-neutral-500">
                              {Math.round(candidate.score * 100)}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !error && suggestions.length > 0 && (
        <p className="mt-3 text-[10px] leading-relaxed text-neutral-400">
          Độ tin cậy hiển thị theo mức phát hiện nhạc cụ. Gợi ý dân tộc, vùng, lối hát và loại sự kiện được suy ra
          từ danh mục nhạc cụ, không phải từ mô hình dự đoán độc lập.
        </p>
      )}
    </div>
  );
}
