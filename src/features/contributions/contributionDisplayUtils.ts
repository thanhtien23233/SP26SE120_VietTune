/** Shared labels and formatters for contributor submissions UI. */

import type { SubmissionRecording } from '@/services/submissionService';

export type SubmissionRecordingMedia = SubmissionRecording & {
  audioUrl?: string | null;
  audiofileurl?: string | null;
};

export function formatRecordingDurationLabel(seconds?: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatRecordingFileSizeMb(bytes?: number | null): string | null {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export const CONTRIBUTOR_STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Bản nháp', color: 'bg-amber-50/95 text-amber-950 border-amber-200/90' },
  1: { label: 'Chờ phê duyệt', color: 'bg-sky-50/95 text-sky-950 border-sky-200/90' },
  2: { label: 'Đã duyệt', color: 'bg-emerald-50/95 text-emerald-950 border-emerald-200/90' },
  3: { label: 'Từ chối', color: 'bg-rose-50/95 text-rose-950 border-rose-200/90' },
  4: { label: 'Yêu cầu cập nhật', color: 'bg-orange-50/95 text-orange-950 border-orange-200/90' },
};

export const CONTRIBUTOR_STAGE_INFO: Record<number, { label: string; color: string }> = {
  0: { label: 'Khởi tạo', color: 'bg-neutral-100/95 text-neutral-800 border-neutral-200/90' },
  1: { label: 'Sơ bộ', color: 'bg-indigo-50/95 text-indigo-900 border-indigo-200/90' },
  2: { label: 'Chuyên sâu', color: 'bg-purple-50/95 text-purple-900 border-purple-200/90' },
  3: { label: 'Hoàn thành', color: 'bg-emerald-50/95 text-emerald-900 border-emerald-200/90' },
};

export function formatContributionPerformanceType(type: string | null | undefined): string {
  if (!type) return '—';
  const mapping: Record<string, string> = {
    instrumental: 'Nhạc cụ',
    acappella: 'Hát không đệm',
    vocal_accompaniment: 'Hát với nhạc đệm',
  };
  return mapping[type] || type;
}

export function formatContributionDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
