import { referenceDataService } from "@/services/referenceDataService";
import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";

function normalizeId(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Chuỗi dạng `ID:<uuid>` từ mapper khi chưa có tên trong lookup lúc map submission. */
function idKeyFromPlaceholder(label: string): string | null {
  const t = label.trim();
  if (!t.toUpperCase().startsWith("ID:")) return null;
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

/**
 * Thay `ID:uuid` trong culturalContext bằng tên từ API danh mục (dân tộc, nghi lễ, nhạc cụ).
 * Dùng cho UI wizard / chi tiết khi payload gốc chỉ có UUID.
 */
export async function resolveCulturalContextForDisplay(
  ctx: LocalRecordingMini["culturalContext"] | undefined,
): Promise<LocalRecordingMini["culturalContext"] | undefined> {
  if (!ctx) return undefined;
  const needsResolve = [ctx.ethnicity, ctx.eventType, ...(ctx.instruments ?? [])].some(
    (s) => !!s && String(s).trim().toUpperCase().startsWith("ID:"),
  );
  if (!needsResolve) return ctx;

  const [ethnics, ceremonies, instruments] = await Promise.all([
    referenceDataService.getEthnicGroups(),
    referenceDataService.getCeremonies(),
    referenceDataService.getInstruments(),
  ]);
  const ethnicById = Object.fromEntries(ethnics.map((e) => [normalizeId(e.id), e.name]));
  const ceremonyById = Object.fromEntries(ceremonies.map((c) => [normalizeId(c.id), c.name]));
  const instrumentById = Object.fromEntries(instruments.map((i) => [normalizeId(i.id), i.name]));

  return {
    ...ctx,
    ethnicity: resolveOne(ctx.ethnicity, ethnicById),
    eventType: resolveOne(ctx.eventType, ceremonyById),
    instruments: resolveInstrumentList(ctx.instruments, instrumentById),
  };
}
