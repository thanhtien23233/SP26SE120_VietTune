import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { referenceDataService } from '@/services/referenceDataService';

function normalizeId(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toLowerCase();
}

/** Chuỗi dạng `ID:<uuid>` từ mapper khi chưa có tên trong lookup lúc map submission. */
function idKeyFromPlaceholder(label: string): string | null {
  const t = label.trim();
  if (!t.toUpperCase().startsWith('ID:')) return null;
  const rest = t.slice(3).trim();
  return rest ? normalizeId(rest) : null;
}

function resolveOne(value: string | undefined, byId: Record<string, string>): string | undefined {
  if (!value) return undefined;
  const key = idKeyFromPlaceholder(value);
  if (key && byId[key]) return byId[key];
  return value;
}

function resolveInstrumentList(
  list: string[] | undefined,
  instrumentById: Record<string, string>,
): string[] | undefined {
  if (!list?.length) return list;
  return list.map((entry) => {
    const key = idKeyFromPlaceholder(entry);
    if (key && instrumentById[key]) return instrumentById[key];
    return entry;
  });
}

const looksLikeIdPlaceholder = (s: unknown): boolean =>
  !!s && String(s).trim().toUpperCase().startsWith('ID:');

/**
 * Thay `ID:uuid` trong culturalContext bằng tên từ API danh mục (dân tộc, nghi lễ, nhạc cụ, tỉnh, lối hát, …).
 * Dùng cho UI wizard / chi tiết khi payload gốc chỉ có UUID.
 */
export async function resolveCulturalContextForDisplay(
  ctx: LocalRecordingMini['culturalContext'] | undefined,
): Promise<LocalRecordingMini['culturalContext'] | undefined> {
  if (!ctx) return undefined;
  const needsResolve = [
    ctx.ethnicity,
    ctx.eventType,
    ctx.region,
    ctx.province,
    ctx.performanceType,
    ...(ctx.instruments ?? []),
  ].some(looksLikeIdPlaceholder);
  if (!needsResolve) return ctx;

  const [ethnics, ceremonies, instruments, provinces, vocalStyles] = await Promise.all([
    referenceDataService.getEthnicGroups(),
    referenceDataService.getCeremonies(),
    referenceDataService.getInstruments(),
    referenceDataService.getProvinces(),
    referenceDataService.getVocalStyles(),
  ]);
  const ethnicById = Object.fromEntries(
    ethnics.map((ethnic) => [normalizeId(ethnic.id), ethnic.name]),
  );
  const ceremonyById = Object.fromEntries(
    ceremonies.map((ceremony) => [normalizeId(ceremony.id), ceremony.name]),
  );
  const instrumentById = Object.fromEntries(
    instruments.map((instrument) => [normalizeId(instrument.id), instrument.name]),
  );
  const provinceById = Object.fromEntries(
    provinces.map((province) => [normalizeId(province.id), province.name]),
  );
  const vocalStyleById = Object.fromEntries(
    vocalStyles.map((vocalStyle) => [normalizeId(vocalStyle.id), vocalStyle.name]),
  );

  return {
    ...ctx,
    ethnicity: resolveOne(ctx.ethnicity, ethnicById),
    eventType: resolveOne(ctx.eventType, ceremonyById),
    region: resolveOne(ctx.region, provinceById),
    province: resolveOne(ctx.province, provinceById),
    performanceType: resolveOne(ctx.performanceType, vocalStyleById),
    instruments: resolveInstrumentList(ctx.instruments, instrumentById),
  };
}
