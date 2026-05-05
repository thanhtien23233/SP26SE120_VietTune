export const CONFIDENCE_THRESHOLDS = {
  /** Confidence >= 0.7 → green / "Cao" */
  HIGH: 0.7,
  /** Confidence >= 0.6 → shown as %, amber chip */
  DISPLAY_MIN: 0.6,
  /** Confidence >= 0.4 → amber bar (but below DISPLAY_MIN won't show %) */
  MEDIUM: 0.4,
  LOW: 0,
} as const;

export const CONFIDENCE_LABELS = {
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
} as const;
