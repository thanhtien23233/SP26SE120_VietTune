import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';

export function cleanMetadataText(value?: string | null, fallback = '—'): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (raw.toUpperCase().startsWith('ID:')) return fallback;
  return raw;
}

export function cleanInstrumentList(values?: string[]): string {
  const cleaned = (values ?? []).map((v) => cleanMetadataText(v, '')).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(', ') : '—';
}

export function isPlaceholderField(value?: string | null): boolean {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  return (
    raw === '' ||
    raw === '—' ||
    raw === '-' ||
    raw === 'không xác định' ||
    raw === 'không có tiêu đề' ||
    raw === 'untitled'
  );
}

function pickNonEmptyText(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const raw = String(value ?? '').trim();
    if (!raw) continue;
    if (raw.toUpperCase().startsWith('ID:')) continue;
    const lowered = raw.toLowerCase();
    if (lowered === 'không có tiêu đề' || lowered === 'untitled') continue;
    return raw;
  }
  return undefined;
}

export function mergeDisplayItem(
  base?: LocalRecordingMini | null,
  detail?: LocalRecordingMini | null,
): LocalRecordingMini | null {
  if (!base && !detail) return null;
  if (!base) return detail ?? null;
  if (!detail) return base;

  return {
    ...base,
    ...detail,
    basicInfo: {
      ...base.basicInfo,
      ...detail.basicInfo,
      title: pickNonEmptyText(
        detail.basicInfo?.title,
        base.basicInfo?.title,
        detail.title,
        base.title,
      ),
      artist: pickNonEmptyText(detail.basicInfo?.artist, base.basicInfo?.artist),
    },
    uploader: {
      ...(base.uploader ?? {}),
      ...(detail.uploader ?? {}),
      username: pickNonEmptyText(
        (detail.uploader as { username?: string } | undefined)?.username,
        (base.uploader as { username?: string } | undefined)?.username,
      ),
    },
    culturalContext: {
      ...(base.culturalContext ?? {}),
      ...(detail.culturalContext ?? {}),
      ethnicity: pickNonEmptyText(
        detail.culturalContext?.ethnicity,
        base.culturalContext?.ethnicity,
      ),
      region: pickNonEmptyText(detail.culturalContext?.region, base.culturalContext?.region),
      province: pickNonEmptyText(detail.culturalContext?.province, base.culturalContext?.province),
      eventType: pickNonEmptyText(
        detail.culturalContext?.eventType,
        base.culturalContext?.eventType,
      ),
      instruments: (() => {
        const detailList = (detail.culturalContext?.instruments ?? [])
          .map((v) => String(v ?? '').trim())
          .filter((v) => v && !v.toUpperCase().startsWith('ID:'));
        if (detailList.length > 0) return detailList;
        const baseList = (base.culturalContext?.instruments ?? [])
          .map((v) => String(v ?? '').trim())
          .filter((v) => v && !v.toUpperCase().startsWith('ID:'));
        return baseList;
      })(),
    },
    uploadedAt: pickNonEmptyText(detail.uploadedAt, base.uploadedAt),
  };
}
