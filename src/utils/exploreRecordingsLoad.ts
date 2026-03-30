import axios from "axios";
import type { ExploreSearchMode } from "@/components/features/ExploreSearchHeader";
import type { Recording, SearchFilters } from "@/types";
import { recordingService } from "@/services/recordingService";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";
import { applyGuestFilters } from "@/utils/exploreGuestFilters";
import { rankRecordingsBySemanticQuery } from "@/utils/exploreSemanticRank";

export type ExploreDataSource =
  | "recordingGuest"
  | "recordingApi"
  | "searchApi"
  | "archiveFallback"
  | "semanticLocal"
  | "empty";

type ApiResponseType = { items: Recording[]; total: number; totalPages: number };

export function isExploreRequestAborted(e: unknown): boolean {
  if (axios.isCancel(e)) return true;
  if (axios.isAxiosError(e)) {
    return e.code === "ERR_CANCELED" || e.name === "CanceledError";
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

/**
 * Single Explore fetch path: keyword vs semantic, guest vs auth, with optional AbortSignal.
 */
export async function loadExploreRecordings(input: ExploreLoadInput): Promise<ExploreLoadSuccess> {
  const { signal, currentPage, exploreMode, filters, sqActive, isAuthenticated } = input;
  const apiOpts = { signal };

  const facetOnly: SearchFilters = { ...filters };
  if (exploreMode === "semantic") delete facetOnly.query;

  try {
    let response: ApiResponseType;

    if (exploreMode === "semantic" && sqActive) {
      if (!isAuthenticated) {
        const guestRes = await recordingService.getGuestRecordings(1, 500, apiOpts);
        const raw = Array.isArray(guestRes?.items) ? guestRes.items : [];
        const pooled = applyGuestFilters(raw, facetOnly);
        const ranked = rankRecordingsBySemanticQuery(pooled, sqActive);
        response = { items: ranked, total: ranked.length, totalPages: 1 };
      } else {
        let raw: Recording[] = [];
        if (Object.keys(facetOnly).length > 0) {
          const res = await recordingService.searchRecordings(facetOnly, 1, 200, apiOpts);
          raw = Array.isArray((res as ApiResponseType)?.items) ? (res as ApiResponseType).items : [];
        } else {
          const res = await recordingService.getRecordings(1, 500, apiOpts);
          raw = Array.isArray((res as ApiResponseType)?.items) ? (res as ApiResponseType).items : [];
        }
        const ranked = rankRecordingsBySemanticQuery(raw, sqActive);
        response = { items: ranked, total: ranked.length, totalPages: 1 };
      }
    } else if (!isAuthenticated) {
      const guestRes = await recordingService.getGuestRecordings(currentPage, 20, apiOpts);
      const activeFilters = exploreMode === "semantic" ? facetOnly : filters;
      const filteredGuestItems = applyGuestFilters(
        Array.isArray(guestRes?.items) ? guestRes.items : [],
        activeFilters,
      );
      response = {
        items: filteredGuestItems,
        total: filteredGuestItems.length,
        totalPages: 1,
      };
    } else if (Object.keys(exploreMode === "semantic" ? facetOnly : filters).length > 0) {
      const activeFilters = exploreMode === "semantic" ? facetOnly : filters;
      const res = await recordingService.searchRecordings(activeFilters, currentPage, 20, apiOpts);
      response = res as ApiResponseType;
    } else {
      const res = await recordingService.getRecordings(currentPage, 20, apiOpts);
      response = res as ApiResponseType;
    }

    const apiItems = Array.isArray(response?.items) ? response.items : [];
    const apiTotal = typeof response?.total === "number" ? response.total : apiItems.length;
    let dataSource: ExploreDataSource = "empty";

    if (exploreMode === "semantic" && sqActive) {
      dataSource = apiItems.length > 0 ? "semanticLocal" : "empty";
    } else if (!isAuthenticated) {
      dataSource = apiItems.length > 0 ? "recordingGuest" : "empty";
    } else if (Object.keys(exploreMode === "semantic" ? facetOnly : filters).length > 0) {
      dataSource = apiItems.length > 0 ? "searchApi" : "empty";
    } else {
      dataSource = apiItems.length > 0 ? "recordingApi" : "empty";
    }

    return {
      recordings: sortByUploadedDesc(apiItems),
      totalResults: apiTotal,
      dataSource,
    };
  } catch (error) {
    if (isExploreRequestAborted(error)) throw error;
    const warning =
      "Không tải được dữ liệu. Bạn có thể thử lại sau.";
    try {
      const fallback = await fetchVerifiedSubmissionsAsRecordings({ signal });
      if (signal?.aborted) throw error;
      const activeFilters = exploreMode === "semantic" ? facetOnly : filters;
      let filteredFallback = !isAuthenticated ? applyGuestFilters(fallback, activeFilters) : fallback;
      if (exploreMode === "semantic" && sqActive) {
        filteredFallback = rankRecordingsBySemanticQuery(filteredFallback, sqActive);
      }
      const sorted = sortByUploadedDesc(filteredFallback);
      const sliceLen = exploreMode === "semantic" && sqActive ? sorted.length : 20;
      return {
        recordings: sorted.slice(0, sliceLen),
        totalResults: sorted.length,
        dataSource: sorted.length > 0 ? "archiveFallback" : "empty",
        fetchWarning: warning,
      };
    } catch (inner) {
      if (isExploreRequestAborted(inner)) throw inner;
      return {
        recordings: [],
        totalResults: 0,
        dataSource: "empty",
        fetchWarning: warning,
      };
    }
  }
}
