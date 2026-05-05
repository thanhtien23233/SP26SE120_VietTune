import { CONFIDENCE_THRESHOLDS } from '@/features/upload/constants/instrumentConfidence';
import { cn } from '@/utils/helpers';

type InstrumentConfidenceBarProps = {
  /** Display label (instrument name from BE `name`). */
  name: string;
  confidence?: number | null;
  maxConfidence?: number | null;
  compact?: boolean;
  className?: string;
};

function clampConfidence(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getTone(confidence: number): {
  fillClass: string;
  chipClass: string;
} {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return {
      fillClass: 'bg-emerald-500',
      chipClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return {
      fillClass: 'bg-amber-500',
      chipClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    };
  }
  return {
    fillClass: 'bg-red-500',
    chipClass: 'bg-red-50 text-red-700 ring-red-200',
  };
}

export function InstrumentConfidenceBar({
  name,
  confidence,
  maxConfidence,
  compact = false,
  className,
}: InstrumentConfidenceBarProps) {
  const normalized = clampConfidence(confidence);
  const percent = normalized == null ? null : Math.round(normalized * 100);
  const width = percent != null ? `${percent}%` : '0%';
  const tone = getTone(normalized ?? 0);
  const showPercent = normalized != null && normalized >= CONFIDENCE_THRESHOLDS.DISPLAY_MIN;

  return (
    <div className={cn('flex items-center gap-2', compact ? 'text-xs' : 'text-sm', className)}>
      <span
        className={cn(
          'font-medium text-neutral-800',
          compact ? 'max-w-[110px] truncate' : 'min-w-[120px] max-w-[220px] truncate',
        )}
        title={name}
      >
        {name}
      </span>

      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-neutral-200',
          compact ? 'h-1.5 w-16' : 'h-2.5 w-40',
        )}
        role="progressbar"
        aria-label={`AI confidence cho ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? 0}
      >
        {percent != null ? (
          <div className={cn('h-full transition-all duration-300 ease-out', tone.fillClass)} style={{ width }} />
        ) : (
          <div className="h-full w-full bg-neutral-300/70" />
        )}
      </div>

      {showPercent ? (
        <span className={cn('rounded-full px-2 py-0.5 font-semibold ring-1', tone.chipClass)}>
          {percent}%
        </span>
      ) : normalized != null ? (
        <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700 ring-1 ring-red-200">
          Độ tin cậy thấp
        </span>
      ) : (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-semibold text-neutral-600 ring-1 ring-neutral-200">
          Không rõ độ tin cậy
        </span>
      )}

      {!compact &&
        typeof maxConfidence === 'number' &&
        Number.isFinite(maxConfidence) &&
        clampConfidence(maxConfidence) != null && (
          <span className="text-xs text-neutral-500">
            peak {Math.round((clampConfidence(maxConfidence) as number) * 100)}%
          </span>
        )}
    </div>
  );
}

export default InstrumentConfidenceBar;
