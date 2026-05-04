import { type ClassValue, clsx } from 'clsx';

import { mapApiSubmissionStatusToModeration } from '@/services/submissionApiMapper';
import { ModerationStatus } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Migration function: Chuyển đổi video từ audioData sang videoData
 * Hàm này sẽ tự động migrate các bản ghi cũ có mediaType === "video"
 * nhưng đang lưu trong audioData sang videoData
 */
export function migrateVideoDataToVideoData<
  T extends { mediaType?: 'audio' | 'video' | 'youtube'; audioData?: unknown; videoData?: unknown },
>(recordings: T[]): T[] {
  const migrated = recordings.map((rec) => {
    // Chỉ migrate nếu:
    // 1. mediaType === "video"
    // 2. Có audioData (không null/undefined và không rỗng)
    // 3. Chưa có videoData hoặc videoData rỗng/null
    if (
      rec.mediaType === 'video' &&
      typeof rec.audioData === 'string' &&
      rec.audioData.trim().length > 0 &&
      (!rec.videoData || (typeof rec.videoData === 'string' && rec.videoData.trim().length === 0))
    ) {
      return {
        ...rec,
        videoData: rec.audioData, // Chuyển audioData sang videoData
        audioData: null, // Xóa audioData
      };
    }
    return rec;
  });

  // Pure function: no storage write. Callers use recordingStorage.setLocalRecording per item if needed.
  return migrated;
}

/**
 * Format date and time to Vietnamese locale with full date and time
 * Format: "dd/MM/yyyy, HH:mm:ss"
 *
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in Vietnamese locale, or '-' if invalid
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '-';
  }
}

/**
 * Format date only (without time) to Vietnamese locale
 * Format: "dd/MM/yyyy"
 *
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in Vietnamese locale, or '-' if invalid
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return '-';
  }
}

export function formatRelativeTimeVi(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    const diffMs = Date.now() - date.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 45) return 'Vừa xong';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} phút trước`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} giờ trước`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day} ngày trước`;
    return formatDate(date);
  } catch {
    return '-';
  }
}

/**
 * Trạng thái kiểm duyệt sang tiếng Việt (dùng chung cho Contributions, Moderation, ApprovedRecordings).
 */
export function getModerationStatusLabel(
  status?: ModerationStatus | string | number | null,
): string {
  if (status === null || status === undefined) return 'Không xác định';
  if (status === '') return 'Không xác định';
  const api = mapApiSubmissionStatusToModeration(status);
  const s =
    typeof status === 'string' && (Object.values(ModerationStatus) as string[]).includes(status)
      ? (status as ModerationStatus)
      : toModerationUiStatus(api);
  switch (s) {
    case ModerationStatus.PENDING_REVIEW:
    case 'PENDING_REVIEW':
      return 'Đang chờ được kiểm duyệt';
    case ModerationStatus.IN_REVIEW:
    case 'IN_REVIEW':
      return 'Đang được kiểm duyệt';
    case ModerationStatus.APPROVED:
    case 'APPROVED':
      return 'Đã được kiểm duyệt';
    case ModerationStatus.REJECTED:
    case 'REJECTED':
      return 'Đã bị từ chối vĩnh viễn';
    case ModerationStatus.TEMPORARILY_REJECTED:
    case 'TEMPORARILY_REJECTED':
      return 'Đã bị từ chối tạm thời';
    case ModerationStatus.EMBARGOED:
    case 'EMBARGOED':
      return 'Đang hạn chế công bố';
    default:
      return String(s);
  }
}

export function getModerationStatusBadgeClassNames(
  status?: ModerationStatus | string | number | null,
): string {
  if (status === null || status === undefined) {
    return 'inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-700';
  }
  if (status === '') {
    return 'inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-700';
  }
  const api = mapApiSubmissionStatusToModeration(status);
  const s =
    typeof status === 'string' && (Object.values(ModerationStatus) as string[]).includes(status)
      ? (status as ModerationStatus)
      : toModerationUiStatus(api);
  switch (s) {
    case ModerationStatus.PENDING_REVIEW:
    case ModerationStatus.IN_REVIEW:
      return 'inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700';
    case ModerationStatus.APPROVED:
      return 'inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700';
    case ModerationStatus.REJECTED:
      return 'inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700';
    case ModerationStatus.TEMPORARILY_REJECTED:
      return 'inline-flex rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700';
    case ModerationStatus.EMBARGOED:
      return 'inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800';
    default:
      return 'inline-flex rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-700';
  }
}
