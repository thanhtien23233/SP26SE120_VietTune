/**
 * Build tags array from local recording (UploadMusic contributor options).
 * Used so AudioPlayer, VideoPlayer, and "Thẻ" on RecordingDetailPage show the same tags.
 */

import { REGION_NAMES } from '@/config/constants';
import { Region } from '@/types';

export type OriginalLocalDataForRegion = {
  region?: string;
  culturalContext?: { region?: string };
};

/**
 * Returns the region display label. When the recording is from UploadMusic (originalLocalData set)
 * and the contributor did not select any region, returns "Không xác định" instead of defaulting
 * to "Đồng bằng Bắc Bộ". For API recordings (no originalLocalData), returns REGION_NAMES[region].
 */
export function getRegionDisplayName(
  recordingRegion: Region | undefined,
  originalLocalData?: OriginalLocalDataForRegion | null,
): string {
  if (originalLocalData) {
    const regionStr =
      originalLocalData.region?.trim() || originalLocalData.culturalContext?.region?.trim();
    if (regionStr) return regionStr;
  }
  if (!recordingRegion || !REGION_NAMES[recordingRegion]) return 'Không xác định';
  return REGION_NAMES[recordingRegion];
}

export const PERFORMANCE_KEY_TO_LABEL: Record<string, string> = {
  instrumental: 'Chỉ nhạc cụ (Instrumental)',
  acappella: 'Chỉ giọng hát không đệm (Acappella)',
  vocal_accompaniment: 'Giọng hát có nhạc đệm (Vocal with accompaniment)',
};

export type LocalRecordingForTags = {
  basicInfo?: { genre?: string };
  culturalContext?: {
    ethnicity?: string;
    region?: string;
    province?: string;
    eventType?: string;
    performanceType?: string;
    instruments?: string[];
  };
  tags?: string[];
};

/**
 * Returns tags array from contributor-selected options (genre, ethnicity, region, province, eventType, performanceType label, instruments).
 * Use local.tags when present; otherwise build from basicInfo + culturalContext for backward compatibility.
 */
export function buildTagsFromLocal(local: LocalRecordingForTags): string[] {
  if (local.tags && local.tags.length > 0) return local.tags;
  const genreVal = local.basicInfo?.genre ?? '';
  const ethnicityVal = local.culturalContext?.ethnicity ?? '';
  const regionVal = local.culturalContext?.region ?? '';
  const provinceVal = local.culturalContext?.province ?? '';
  const eventVal = local.culturalContext?.eventType ?? '';
  const perfKey = local.culturalContext?.performanceType ?? '';
  const perfLabel = perfKey ? (PERFORMANCE_KEY_TO_LABEL[perfKey] ?? perfKey) : '';
  const inst = local.culturalContext?.instruments ?? [];
  return [genreVal, ethnicityVal, regionVal, provinceVal, eventVal, perfLabel, ...inst].filter(
    Boolean,
  );
}
