/**
 * Reference Data Service — fetches dropdown data from the backend API.
 *
 * Endpoints:
 *  - /api/ReferenceData/ethnic-groups → ethnicities
 *  - /api/ReferenceData/provinces     → provinces (with regionCode)
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

async function fetchAllPages<T>(url: string, pageSize = 100): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let total = Infinity;

  while (all.length < total) {
    try {
      const separator = url.includes("?") ? "&" : "?";
      const fullUrl = `${url}${separator}page=${page}&pageSize=${pageSize}`;
      const res = await api.get<PaginatedApiResponse<T>>(fullUrl);
      const items = res?.data ?? [];
      all.push(...items);
      total = res?.total ?? items.length;
      // Break if no items returned (empty page) or we've fetched enough
      if (items.length === 0 || all.length >= total) break;
      page++;
    } catch (err) {
      console.warn(`Failed to fetch ${url} page ${page}:`, err);
      break;
    }
  }

  return all;
}

// ---------- In-memory cache ----------

const cache: Record<string, { data: unknown[]; ts: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  getDistricts: () => cachedFetch<DistrictItem>("districts", "/ReferenceData/districts"),

  /** Fetch all communes (phường xã) */
  getCommunes: () => cachedFetch<CommuneItem>("communes", "/ReferenceData/communes"),

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
