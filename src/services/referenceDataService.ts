/**
 * Reference Data Service — fetches dropdown data from the backend API.
 *
 * Endpoints:
 *  - /api/ReferenceData/ethnic-groups → ethnicities
 *  - /api/ReferenceData/provinces     → provinces (with regionCode)
 *  - /api/District                    → districts
 *  - /api/Commune                     → communes
 *  - /api/ReferenceData/ceremonies    → event types / ceremonies
 *  - /api/ReferenceData/vocal-styles  → vocal styles
 *  - /api/ReferenceData/musical-scales → musical scales
 *  - /api/ReferenceData/tags          → tags
 *  - /api/Instrument                  → instruments
 */

import { apiFetch, apiOk, normalizePagedResponse } from '@/api';
import type {
  ApiCommuneListQuery,
  ApiDistrictListQuery,
  ApiInstrumentListQuery,
  ApiReferenceDataCeremoniesQuery,
  ApiReferenceDataEthnicGroupsQuery,
  ApiReferenceDataMusicalScalesQuery,
  ApiReferenceDataProvincesQuery,
  ApiReferenceDataTagsQuery,
  ApiReferenceDataVocalStylesQuery,
} from '@/api';
import { logServiceWarn } from '@/services/serviceLogger';

// ---------- Types ----------

export interface EthnicGroupItem {
  id: string;
  name: string;
  description?: string | null;
  languageFamily?: string | null;
  primaryRegion?: string | null;
  imageUrl?: string | null;
}

export interface ProvinceItem {
  id: string;
  name: string;
  regionCode: string;
}

export interface DistrictItem {
  id: string;
  name: string;
  provinceId: string;
}

export interface CommuneItem {
  id: string;
  name: string;
  districtId: string;
}

export interface CeremonyItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface InstrumentItem {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  tuningSystem?: string | null;
  constructionMethod?: string | null;
  imageUrl?: string | null;
  originEthnicGroupId?: string | null;
}

export interface VocalStyleItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface MusicalScaleItem {
  id: string;
  name: string;
  description?: string | null;
}

export interface TagItem {
  id: string;
  name: string;
}

// ---------- Helper: fetch ALL pages ----------

const DEFAULT_REF_PAGE_SIZE = 250;
/** Parallel page requests per wave (Commune/District có thể >30 trang — gọi tuần tự rất chậm). */
const REF_PAGE_FETCH_CONCURRENCY = 8;

type PagedQuery = { page?: number; pageSize?: number };

async function fetchAllPages<T, Q extends PagedQuery>(
  fetchPage: (page: number, pageSize: number) => Promise<unknown>,
  _baseQuery: Q,
  pageSize = DEFAULT_REF_PAGE_SIZE,
): Promise<T[]> {
  let first;
  try {
    first = await fetchPage(1, pageSize);
  } catch (err) {
    logServiceWarn('Failed to fetch reference data page 1', err);
    return [];
  }

  const firstNorm = normalizePagedResponse<T>(first);
  const firstItems = firstNorm.items ?? [];
  const all: T[] = [...firstItems];
  if (firstItems.length === 0) return all;

  const total = typeof firstNorm.total === 'number' ? firstNorm.total : undefined;
  if (total !== undefined && all.length >= total) return all;

  if (total === undefined) {
    let page = 2;
    let lastLen = firstItems.length;
    while (lastLen === pageSize) {
      try {
        const res = await fetchPage(page, pageSize);
        const items = normalizePagedResponse<T>(res).items ?? [];
        all.push(...items);
        lastLen = items.length;
        if (items.length === 0) break;
        page++;
      } catch (err) {
        logServiceWarn(`Failed to fetch reference data page ${page}`, err);
        break;
      }
    }
    return all;
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return all;

  const rest = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < rest.length; i += REF_PAGE_FETCH_CONCURRENCY) {
    const chunk = rest.slice(i, i + REF_PAGE_FETCH_CONCURRENCY);
    try {
      const batch = await Promise.all(
        chunk.map((p) => fetchPage(p, pageSize)),
      );
      for (const res of batch) {
        all.push(...(normalizePagedResponse<T>(res).items ?? []));
      }
    } catch (err) {
      logServiceWarn('Failed to fetch reference data parallel pages', err);
      break;
    }
  }
  return all;
}

// ---------- In-memory cache ----------

const cache: Record<string, { data: unknown[]; ts: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000;

async function cachedFetch<T, Q extends PagedQuery>(key: string, url: string, baseQuery: Q): Promise<T[]> {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data as T[];
  }
  const data = await fetchAllPages<T, Q>(
    async (page, pageSize) => {
      switch (url) {
        case '/ReferenceData/ethnic-groups':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/ethnic-groups', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/ReferenceData/provinces':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/provinces', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/ReferenceData/ceremonies':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/ceremonies', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/ReferenceData/vocal-styles':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/vocal-styles', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/ReferenceData/musical-scales':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/musical-scales', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/ReferenceData/tags':
          return apiOk(
            apiFetch.GET('/api/ReferenceData/tags', { params: { query: { ...baseQuery, page, pageSize } } }),
          );
        case '/Instrument':
          return apiOk(apiFetch.GET('/api/Instrument', { params: { query: { ...baseQuery, page, pageSize } } }));
        case '/District':
          return apiOk(apiFetch.GET('/api/District', { params: { query: { ...baseQuery, page, pageSize } } }));
        case '/Commune':
          return apiOk(apiFetch.GET('/api/Commune', { params: { query: { ...baseQuery, page, pageSize } } }));
        default:
          throw new Error(`Unsupported reference data url: ${url}`);
      }
    },
    baseQuery,
  );
  cache[key] = { data, ts: Date.now() };
  return data;
}

// ---------- Public API ----------

export const referenceDataService = {
  /** Fetch all ethnic groups (dân tộc) */
  getEthnicGroups: () =>
    cachedFetch<EthnicGroupItem, ApiReferenceDataEthnicGroupsQuery>(
      'ethnicGroups',
      '/ReferenceData/ethnic-groups',
      {},
    ),

  /** Fetch all provinces (tỉnh thành) */
  getProvinces: () =>
    cachedFetch<ProvinceItem, ApiReferenceDataProvincesQuery>('provinces', '/ReferenceData/provinces', {}),

  /** Fetch all districts (quận huyện) */
  getDistricts: () =>
    cachedFetch<DistrictItem, ApiDistrictListQuery>('districts', '/District', {}),

  /** Fetch districts by province Id */
  getDistrictsByProvince: (provinceId: string) =>
    (async () => {
      const key = `districts_prov_${provinceId}`;
      const entry = cache[key];
      if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data as DistrictItem[];
      const { data: res, response } = await apiFetch.GET('/api/District/get-by-province/{provinceId}', {
        params: { path: { provinceId } },
      });
      let parsed: unknown = res;
      if (parsed == null && response.ok) {
        try { parsed = await response.clone().json(); } catch { /* empty body */ }
      }
      const data = Array.isArray(parsed)
        ? (parsed as DistrictItem[])
        : (normalizePagedResponse<DistrictItem>(parsed as unknown).items ?? []);
      cache[key] = { data, ts: Date.now() };
      return data;
    })(),

  /** Fetch all communes (phường xã) */
  getCommunes: () =>
    cachedFetch<CommuneItem, ApiCommuneListQuery>('communes', '/Commune', {}),

  /** Fetch communes by district Id */
  getCommunesByDistrict: (districtId: string) =>
    (async () => {
      const key = `communes_dist_${districtId}`;
      const entry = cache[key];
      if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data as CommuneItem[];
      const { data: res, response } = await apiFetch.GET('/api/Commune/get-by-district/{districtId}', {
        params: { path: { districtId } },
      });
      let parsed: unknown = res;
      if (parsed == null && response.ok) {
        try { parsed = await response.clone().json(); } catch { /* empty body */ }
      }
      const data = Array.isArray(parsed)
        ? (parsed as CommuneItem[])
        : (normalizePagedResponse<CommuneItem>(parsed as unknown).items ?? []);
      cache[key] = { data, ts: Date.now() };
      return data;
    })(),

  /** Fetch all ceremonies / event types (nghi lễ / loại sự kiện) */
  getCeremonies: () =>
    cachedFetch<CeremonyItem, ApiReferenceDataCeremoniesQuery>(
      'ceremonies',
      '/ReferenceData/ceremonies',
      {},
    ),

  /** Fetch all vocal styles */
  getVocalStyles: () =>
    cachedFetch<VocalStyleItem, ApiReferenceDataVocalStylesQuery>(
      'vocalStyles',
      '/ReferenceData/vocal-styles',
      {},
    ),

  /** Fetch all musical scales */
  getMusicalScales: () =>
    cachedFetch<MusicalScaleItem, ApiReferenceDataMusicalScalesQuery>(
      'musicalScales',
      '/ReferenceData/musical-scales',
      {},
    ),

  /** Fetch all tags */
  getTags: () =>
    cachedFetch<TagItem, ApiReferenceDataTagsQuery>('tags', '/ReferenceData/tags', {}),

  /** Fetch all instruments (nhạc cụ) */
  getInstruments: () =>
    cachedFetch<InstrumentItem, ApiInstrumentListQuery>('instruments', '/Instrument', {}),

  /** Clear cache (e.g. after admin edits reference data) */
  clearCache: () => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
};
