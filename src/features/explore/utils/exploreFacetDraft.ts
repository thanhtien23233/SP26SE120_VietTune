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
  instrumentTags: string[];
  culturalTags: string[];
};

export function createEmptyExploreFacetDraft(): ExploreFacetDraft {
  return {
    query: '',
    ethnicityIds: [],
    recordingTypes: [],
    region: null,
    genreTags: [],
    instrumentTags: [],
    culturalTags: [],
  };
}

export function exploreDraftToSearchFilters(d: ExploreFacetDraft): SearchFilters {
  const facetTags = [...d.genreTags, ...d.instrumentTags, ...d.culturalTags];
  const ethnicityNames = d.ethnicityIds.filter(Boolean);
  const tags = [...facetTags, ...ethnicityNames];
  const out: SearchFilters = {};
  const q = d.query.trim();
  if (q) out.query = q;
  if (ethnicityNames.length) out.ethnicityIds = [...ethnicityNames];
  if (d.recordingTypes.length) out.recordingTypes = [...d.recordingTypes];
  if (d.region) out.regions = [d.region];
  if (tags.length) out.tags = tags;
  return out;
}

export function searchFiltersToExploreDraft(
  f: SearchFilters,
  opts: ExploreFilterOptions,
): ExploreFacetDraft {
  const genreSet = new Set(opts.genreTags.map((g) => g.label));
  const instrSet = new Set(opts.instruments.map((i) => i.label));
  const cultSet = new Set(opts.culturalContexts.map((c) => c.label));
  const ethnicityLabels = new Set(opts.ethnicities.map((e) => e.label));

  const rawTags = f.tags ?? [];
  const genreTags: string[] = [];
  const instrumentTags: string[] = [];
  const culturalTags: string[] = [];
  const extraEthnicity: string[] = [];
  const leftover: string[] = [];

  for (const t of rawTags) {
    if (genreSet.has(t)) genreTags.push(t);
    else if (instrSet.has(t)) instrumentTags.push(t);
    else if (cultSet.has(t)) culturalTags.push(t);
    else if (ethnicityLabels.has(t)) extraEthnicity.push(t);
    else leftover.push(t);
  }

  const baseEth = f.ethnicityIds ?? [];
  const ethnicityIds = [...new Set([...baseEth, ...extraEthnicity])];

  return {
    query: f.query ?? '',
    ethnicityIds,
    recordingTypes: f.recordingTypes ? [...f.recordingTypes] : [],
    region: f.regions?.[0] ?? null,
    genreTags: [...genreTags, ...leftover],
    instrumentTags,
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
