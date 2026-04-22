import type { ExploreSearchMode } from '@/components/features/ExploreSearchHeader';
import { applyGuestFilters } from '@/features/explore/utils/exploreGuestFilters';
import { recordingService } from '@/services/recordingService';
import { fetchVerifiedSubmissionsAsRecordings } from '@/services/researcherArchiveService';
import { fetchRecordingsSearchByFilter } from '@/services/researcherRecordingFilterSearch';
import { semanticSearchService } from '@/services/semanticSearchService';
import type { Recording, SearchFilters } from '@/types';

export type ExploreDataSource =
  | 'recordingGuest'
  | 'recordingApi'
  | 'searchApi'
  | 'archiveFallback'
  | 'semanticLocal'
  | 'empty';

type ApiResponseType = { items: Recording[]; total: number; totalPages: number };

function asApiResponse(value: unknown): ApiResponseType {
  if (!value || typeof value !== 'object') {
    return { items: [], total: 0, totalPages: 1 };
  }
  const root = value as Record<string, unknown>;
  const items = Array.isArray(root.items) ? (root.items as Recording[]) : [];
  const total = typeof root.total === 'number' ? root.total : items.length;
  const totalPages = typeof root.totalPages === 'number' ? root.totalPages : 1;
  return { items, total, totalPages };
}

export function isExploreRequestAborted(e: unknown): boolean {
  if (e && typeof e === 'object') {
    const name = (e as { name?: string }).name;
    if (name === 'AbortError' || name === 'CanceledError') return true;
    const code = (e as { code?: string }).code;
    if (code === 'ERR_CANCELED') return true;
  }
  return false;
}

export type ExploreLoadInput = {
  signal?: AbortSignal;
  currentPage: number;
  exploreMode: ExploreSearchMode;
  filters: SearchFilters;
  sqActive: string;
  isAuthenticated: boolean;
};

export type ExploreLoadSuccess = {
  recordings: Recording[];
  totalResults: number;
  dataSource: ExploreDataSource;
  /** Set when primary API failed but archive fallback (or empty) was used. */
  fetchWarning?: string;
};

function sortByUploadedDesc(items: Recording[]): Recording[] {
  return [...items].sort(
    (a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
  );
}

async function fetchApprovedLocalFallback(): Promise<Recording[]> {
  try {
    const { getLocalRecordingMetaList, getLocalRecordingFull } = await import('@/services/recordingStorage');
    const { migrateVideoDataToVideoData } = await import('@/utils/helpers');
    const { convertLocalToRecording } = await import('@/utils/localRecordingToRecording');
    const { ModerationStatus } = await import('@/types');

    const meta = await getLocalRecordingMetaList();
    const migrated = migrateVideoDataToVideoData(meta as import('@/types').LocalRecording[]);
    const approved = migrated.filter(
      (r) =>
        r.moderation &&
        typeof r.moderation === 'object' &&
        'status' in r.moderation &&
        (r.moderation as { status?: string }).status === ModerationStatus.APPROVED,
    );
    const fullItems = await Promise.all(approved.map((r) => getLocalRecordingFull(r.id ?? '')));
    const locals = fullItems.filter((r): r is import('@/types').LocalRecording => r != null);
    return Promise.all(locals.map((r) => convertLocalToRecording(r)));
  } catch {
    return [];
  }
}

/**
 * Fetch verified catalog from all available sources (submissions → filter API → local IDB).
 * Every step is individually wrapped so a single 500 does not break the chain.
 */
async function fetchFullCatalog(signal?: AbortSignal): Promise<Recording[]> {
  let pool: Recording[] = [];
  try {
    pool = await fetchVerifiedSubmissionsAsRecordings({ signal });
  } catch { /* backend may 500 — continue */ }
  if (pool.length === 0) {
    try {
      pool = await fetchRecordingsSearchByFilter({ page: 1, pageSize: 500 });
    } catch { /* continue */ }
  }
  if (pool.length === 0) {
    pool = await fetchApprovedLocalFallback();
  }
  return pool;
}

/**
 * Single Explore fetch path: keyword vs semantic, guest vs auth, with optional AbortSignal.
 */
export async function loadExploreRecordings(input: ExploreLoadInput): Promise<ExploreLoadSuccess> {
  const { signal, currentPage, exploreMode, filters, sqActive, isAuthenticated } = input;
  const apiOpts = { signal };

  const facetOnly: SearchFilters = { ...filters };
  if (exploreMode === 'semantic') delete facetOnly.query;

  let response: ApiResponseType;
  let fetchWarning: string | undefined;

  try {
    // ── Semantic search ──────────────────────────────────────────────────
    if (exploreMode === 'semantic' && sqActive) {
      try {
        const semanticResponse = await semanticSearchService.searchSemantic({
          q: sqActive,
          topK: 10,
        });
        const ranked = semanticResponse.map((r) => ({
          ...r.recording,
          _semanticScore: r.similarityScore,
        }));
        const needFacet = !isAuthenticated || Object.keys(facetOnly).length > 0;
        const pooled = needFacet ? applyGuestFilters(ranked, facetOnly) : ranked;
        response = { items: pooled, total: pooled.length, totalPages: 1 };
      } catch (semErr) {
        if (isExploreRequestAborted(semErr)) throw semErr;
        const catalog = await fetchFullCatalog(signal);
        const clientFiltered = applyGuestFilters(catalog, { ...facetOnly, query: sqActive });
        response = { items: clientFiltered, total: clientFiltered.length, totalPages: 1 };
        if (clientFiltered.length > 0) {
          fetchWarning = 'Tìm ngữ nghĩa tạm lỗi — hiển thị kết quả từ kho dữ liệu.';
        } else {
          fetchWarning = 'Hệ thống tìm kiếm ngữ nghĩa tạm thời không khả dụng.';
        }
      }

    // ── Guest keyword / facets ───────────────────────────────────────────
    } else if (!isAuthenticated) {
      const guestRes = await recordingService.getGuestRecordings(currentPage, 20, apiOpts);
      const activeFilters = exploreMode === 'semantic' ? facetOnly : filters;
      const filteredGuestItems = applyGuestFilters(
        Array.isArray(guestRes?.items) ? guestRes.items : [],
        activeFilters,
      );
      response = {
        items: filteredGuestItems,
        total: filteredGuestItems.length,
        totalPages: 1,
      };

    // ── Authenticated keyword / facets ───────────────────────────────────
    } else if (Object.keys(exploreMode === 'semantic' ? facetOnly : filters).length > 0) {
      const activeFilters = exploreMode === 'semantic' ? facetOnly : filters;
      const res = await recordingService.searchRecordings(activeFilters, currentPage, 20, apiOpts);
      response = asApiResponse(res);

      if (response.items.length === 0 && activeFilters.query) {
        try {
          const catalog = await fetchFullCatalog(signal);
          const clientFiltered = applyGuestFilters(catalog, activeFilters);
          if (clientFiltered.length > 0) {
            const pageSize = 20;
            const start = Math.max(0, (currentPage - 1) * pageSize);
            const paged = clientFiltered.slice(start, start + pageSize);
            response = {
              items: paged,
              total: clientFiltered.length,
              totalPages: Math.max(1, Math.ceil(clientFiltered.length / pageSize)),
            };
          }
        } catch {
          /* keep original empty response */
        }
      }

    // ── Authenticated default view (no filters) ─────────────────────────
    } else {
      const verified = await fetchFullCatalog(signal);
      const sorted = sortByUploadedDesc(verified);
      const pageSize = 20;
      const start = Math.max(0, (currentPage - 1) * pageSize);
      const items = sorted.slice(start, start + pageSize);
      response = {
        items,
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
      };
    }
  } catch (error) {
    if (isExploreRequestAborted(error)) throw error;
    try {
      const catalog = await fetchFullCatalog(signal);
      if (signal?.aborted) throw error;
      const activeFilters = exploreMode === 'semantic' ? facetOnly : filters;
      const filteredFallback = !isAuthenticated
        ? applyGuestFilters(catalog, activeFilters)
        : catalog;
      const sorted = sortByUploadedDesc(filteredFallback);
      const sliceLen = exploreMode === 'semantic' && sqActive ? sorted.length : 20;
      response = {
        items: sorted.slice(0, sliceLen),
        total: sorted.length,
        totalPages: Math.max(1, Math.ceil(sorted.length / Math.max(sliceLen, 1))),
      };
      if (sorted.length === 0) {
        fetchWarning = 'Không tải được dữ liệu. Bạn có thể thử lại sau.';
      }
    } catch (inner) {
      if (isExploreRequestAborted(inner)) throw inner;
      return {
        recordings: [],
        totalResults: 0,
        dataSource: 'empty',
        fetchWarning: 'Không tải được dữ liệu. Bạn có thể thử lại sau.',
      };
    }
  }

  const apiItems = Array.isArray(response?.items) ? response.items : [];
  const apiTotal = typeof response?.total === 'number' ? response.total : apiItems.length;
  const hasActiveFilters = Object.keys(exploreMode === 'semantic' ? facetOnly : filters).length > 0;
  let dataSource: ExploreDataSource = 'empty';

  if (exploreMode === 'semantic' && sqActive) {
    dataSource = apiItems.length > 0 ? 'searchApi' : 'empty';
  } else if (!isAuthenticated) {
    dataSource = apiItems.length > 0 ? 'recordingGuest' : 'empty';
  } else if (hasActiveFilters) {
    dataSource = apiItems.length > 0 ? 'searchApi' : 'empty';
  } else {
    dataSource = apiItems.length > 0 ? 'recordingApi' : 'empty';
  }

  return {
    recordings: sortByUploadedDesc(apiItems),
    totalResults: apiTotal,
    dataSource,
    fetchWarning,
  };
}
