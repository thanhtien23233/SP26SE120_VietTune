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

import { api } from "@/services/api";

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

// ---------- Paginated response shape ----------

interface PaginatedApiResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------- Helper: fetch ALL pages ----------

const DEFAULT_REF_PAGE_SIZE = 250;
/** Parallel page requests per wave (Commune/District có thể >30 trang — gọi tuần tự rất chậm). */
const REF_PAGE_FETCH_CONCURRENCY = 8;

async function fetchAllPages<T>(url: string, pageSize = DEFAULT_REF_PAGE_SIZE): Promise<T[]> {
  const separator = url.includes("?") ? "&" : "?";
  const urlFor = (page: number) => `${url}${separator}page=${page}&pageSize=${pageSize}`;

  let first;
  try {
    first = await api.get<PaginatedApiResponse<T>>(urlFor(1));
  } catch (err) {
    console.warn(`Failed to fetch ${url} page 1:`, err);
    return [];
  }

  const firstItems = first?.data ?? [];
  const all: T[] = [...firstItems];
  if (firstItems.length === 0) return all;

  const total = typeof first?.total === "number" ? first.total : undefined;
  if (total !== undefined && all.length >= total) return all;

  if (total === undefined) {
    let page = 2;
    let lastLen = firstItems.length;
    while (lastLen === pageSize) {
      try {
        const res = await api.get<PaginatedApiResponse<T>>(urlFor(page));
        const items = res?.data ?? [];
        all.push(...items);
        lastLen = items.length;
        if (items.length === 0) break;
        page++;
      } catch (err) {
        console.warn(`Failed to fetch ${url} page ${page}:`, err);
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
      const batch = await Promise.all(chunk.map((p) => api.get<PaginatedApiResponse<T>>(urlFor(p))));
      for (const res of batch) {
        all.push(...(res?.data ?? []));
      }
    } catch (err) {
      console.warn(`Failed to fetch ${url} parallel pages`, err);
      break;
    }
  }
  return all;
}

// ---------- In-memory cache ----------

const cache: Record<string, { data: unknown[]; ts: number }> = {};
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes — giảm tải lại Commune/District khi mở Researcher/Moderation

async function cachedFetch<T>(key: string, url: string): Promise<T[]> {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data as T[];
  }
  const data = await fetchAllPages<T>(url);
  cache[key] = { data, ts: Date.now() };
  return data;
}

// ---------- Public API ----------

export const referenceDataService = {
  /** Fetch all ethnic groups (dân tộc) */
  getEthnicGroups: () => cachedFetch<EthnicGroupItem>("ethnicGroups", "/ReferenceData/ethnic-groups"),

  /** Fetch all provinces (tỉnh thành) */
  getProvinces: () => cachedFetch<ProvinceItem>("provinces", "/ReferenceData/provinces"),

  /** Fetch all districts (quận huyện) */
  getDistricts: () => cachedFetch<DistrictItem>("districts", "/District"),

  /** Fetch districts by province Id */
  getDistrictsByProvince: (provinceId: string) => cachedFetch<DistrictItem>(`districts_prov_${provinceId}`, `/District/get-by-province/${provinceId}`),

  /** Fetch all communes (phường xã) */
  getCommunes: () => cachedFetch<CommuneItem>("communes", "/Commune"),

  /** Fetch communes by district Id */
  getCommunesByDistrict: (districtId: string) => cachedFetch<CommuneItem>(`communes_dist_${districtId}`, `/Commune/get-by-district/${districtId}`),

  /** Fetch all ceremonies / event types (nghi lễ / loại sự kiện) */
  getCeremonies: () => cachedFetch<CeremonyItem>("ceremonies", "/ReferenceData/ceremonies"),

  /** Fetch all vocal styles */
  getVocalStyles: () => cachedFetch<VocalStyleItem>("vocalStyles", "/ReferenceData/vocal-styles"),

  /** Fetch all musical scales */
  getMusicalScales: () => cachedFetch<MusicalScaleItem>("musicalScales", "/ReferenceData/musical-scales"),

  /** Fetch all tags */
  getTags: () => cachedFetch<TagItem>("tags", "/ReferenceData/tags"),

  /** Fetch all instruments (nhạc cụ) */
  getInstruments: () => cachedFetch<InstrumentItem>("instruments", "/Instrument"),

  /** Clear cache (e.g. after admin edits reference data) */
  clearCache: () => {
    Object.keys(cache).forEach((k) => delete cache[k]);
  },
};
