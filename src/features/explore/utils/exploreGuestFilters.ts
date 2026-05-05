import { recordingFacetHaystack } from '@/features/explore/utils/exploreFacetDraft';
import type { Recording, SearchFilters } from '@/types';
import { normalizeSearchText } from '@/utils/searchText';

/** True when `applyGuestFilters` can narrow rows (fields it actually reads). */
export function hasActiveGuestFilters(filters: SearchFilters): boolean {
  if (normalizeSearchText(filters.query ?? '')) return true;
  if ((filters.regions?.length ?? 0) > 0) return true;
  if ((filters.recordingTypes?.length ?? 0) > 0) return true;
  if ((filters.ethnicityIds?.length ?? 0) > 0) return true;
  if ((filters.tags?.length ?? 0) > 0) return true;
  if (filters.dateFrom || filters.dateTo) return true;
  return false;
}

/** Client-side facet + keyword filter for guest catalog rows. */
export function applyGuestFilters(rows: Recording[], filters: SearchFilters): Recording[] {
  const query = normalizeSearchText(filters.query ?? '');
  const selectedRegions = filters.regions ?? [];
  const selectedTypes = filters.recordingTypes ?? [];
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : null;
  const tags = (filters.tags ?? []).map((t) => normalizeSearchText(t)).filter(Boolean);
  const ethnicityIds = filters.ethnicityIds ?? [];

  return rows.filter((r) => {
    if (query) {
      const title = normalizeSearchText(`${r.title ?? ''} ${r.titleVietnamese ?? ''}`);
      const desc = normalizeSearchText(r.description ?? '');
      const tagText = normalizeSearchText((r.tags ?? []).join(' '));
      const instText = normalizeSearchText(
        (r.instruments ?? []).map((i) => `${i.name ?? ''} ${i.nameVietnamese ?? ''}`).join(' '),
      );
      const ethText = normalizeSearchText(
        `${r.ethnicity?.name ?? ''} ${r.ethnicity?.nameVietnamese ?? ''}`,
      );
      const perfText = normalizeSearchText(
        (r.performers ?? []).map((p) => `${p.name ?? ''} ${p.nameVietnamese ?? ''}`).join(' '),
      );
      const haystack = `${title} ${desc} ${tagText} ${instText} ${ethText} ${perfText}`;
      if (!haystack.includes(query)) return false;
    }
    if (selectedRegions.length > 0 && !selectedRegions.includes(r.region)) return false;
    if (selectedTypes.length > 0 && !selectedTypes.includes(r.recordingType)) return false;
    if (ethnicityIds.length > 0) {
      const ok = ethnicityIds.some(
        (id) =>
          id === r.ethnicity.id || id === r.ethnicity.name || id === r.ethnicity.nameVietnamese,
      );
      if (!ok) return false;
    }
    if (tags.length > 0) {
      const hay = recordingFacetHaystack(r);
      if (!tags.every((t) => hay.includes(t))) return false;
    }
    if (dateFrom || dateTo) {
      const ts = new Date(r.recordedDate || r.uploadedDate || 0).getTime();
      if (Number.isFinite(dateFrom) && ts < (dateFrom as number)) return false;
      if (Number.isFinite(dateTo) && ts > (dateTo as number)) return false;
    }
    return true;
  });
}
