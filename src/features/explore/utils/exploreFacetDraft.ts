import type { ExploreFilterOptions } from '@/constants/exploreFilterOptions';
import type { Recording, SearchFilters } from '@/types';
import { Region, RecordingType } from '@/types';
import { normalizeSearchText } from '@/utils/searchText';

/** Draft facet state for Explore sidebar (applied -> `SearchFilters` on "Apply"). */
export type ExploreFacetDraft = {
  query: string;
  ethnicityIds: string[];
  recordingTypes: RecordingType[];
  region: Region | null;
  genreTags: string[];
  instrumentIds: string[];
  culturalTags: string[];
};

export function createEmptyExploreFacetDraft(): ExploreFacetDraft {
  return {
    query: '',
    ethnicityIds: [],
    recordingTypes: [],
    region: null,
    genreTags: [],
    instrumentIds: [],
    culturalTags: [],
  };
}

export function exploreDraftToSearchFilters(d: ExploreFacetDraft): SearchFilters {
  const tags = [...d.genreTags, ...d.culturalTags];
  const out: SearchFilters = {};
  const q = d.query.trim();
  if (q) out.query = q;
  if (d.ethnicityIds.length) out.ethnicityIds = [...d.ethnicityIds];
  if (d.instrumentIds.length) out.instrumentIds = [...d.instrumentIds];
  if (d.recordingTypes.length) out.recordingTypes = [...d.recordingTypes];
  if (d.region) out.regions = [d.region];
  if (tags.length) out.tags = tags;
  return out;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapValueToUuid(
  value: string,
  options: { id: string; label: string }[],
): string {
  const raw = value.trim();
  if (!raw) return raw;
  if (UUID_RE.test(raw)) return raw;
  const found = options.find((x) => x.label.toLowerCase() === raw.toLowerCase());
  return found?.id ?? raw;
}

export function mapSearchFiltersNamesToUuids(
  f: SearchFilters,
  opts: ExploreFilterOptions,
): SearchFilters {
  const mappedEthnicity = (f.ethnicityIds ?? [])
    .map((v) => mapValueToUuid(v, opts.ethnicities))
    .filter(Boolean);
  const mappedInstruments = (f.instrumentIds ?? [])
    .map((v) => mapValueToUuid(v, opts.instruments))
    .filter(Boolean);

  return {
    ...f,
    ...(mappedEthnicity.length ? { ethnicityIds: [...new Set(mappedEthnicity)] } : {}),
    ...(mappedInstruments.length ? { instrumentIds: [...new Set(mappedInstruments)] } : {}),
  };
}

export function searchFiltersToExploreDraft(
  f: SearchFilters,
  opts: ExploreFilterOptions,
): ExploreFacetDraft {
  const genreSet = new Set(opts.genreTags.map((g) => g.label));
  const cultSet = new Set(opts.culturalContexts.map((c) => c.label));
  const ethnicityLabels = new Set(opts.ethnicities.map((e) => e.label));
  const instrumentLabels = new Set(opts.instruments.map((i) => i.label));

  const rawTags = f.tags ?? [];
  const genreTags: string[] = [];
  const culturalTags: string[] = [];
  const extraEthnicity: string[] = [];
  const leftover: string[] = [];

  for (const t of rawTags) {
    if (genreSet.has(t)) genreTags.push(t);
    else if (cultSet.has(t)) culturalTags.push(t);
    else if (ethnicityLabels.has(t)) extraEthnicity.push(t);
    else leftover.push(t);
  }

  const baseEth = (f.ethnicityIds ?? []).map((v) => mapValueToUuid(v, opts.ethnicities));
  const fromTagEth = extraEthnicity.map((v) => mapValueToUuid(v, opts.ethnicities));
  const ethnicityIds = [...new Set([...baseEth, ...fromTagEth].filter(Boolean))];
  const instrumentIds = (f.instrumentIds ?? [])
    .map((v) => mapValueToUuid(v, opts.instruments))
    .filter(Boolean);
  for (const t of rawTags) {
    if (instrumentLabels.has(t)) {
      const mapped = mapValueToUuid(t, opts.instruments);
      if (mapped) instrumentIds.push(mapped);
    }
  }

  return {
    query: f.query ?? '',
    ethnicityIds,
    recordingTypes: f.recordingTypes ? [...f.recordingTypes] : [],
    region: f.regions?.[0] ?? null,
    genreTags: [...genreTags, ...leftover],
    instrumentIds: [...new Set(instrumentIds)],
    culturalTags,
  };
}

/** Tag + instrument-name haystack for guest filtering. */
export function recordingFacetHaystack(r: Recording): string {
  const tags = (r.tags ?? []).map((t) => normalizeSearchText(t)).join(' ');
  const inst = (r.instruments ?? [])
    .map((i) => normalizeSearchText(`${i.name ?? ''} ${i.nameVietnamese ?? ''}`))
    .join(' ');
  return normalizeSearchText(`${tags} ${inst}`);
}
