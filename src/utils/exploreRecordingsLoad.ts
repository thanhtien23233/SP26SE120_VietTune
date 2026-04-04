import axios from "axios";
import type { ExploreSearchMode } from "@/components/features/ExploreSearchHeader";
import type { Recording, SearchFilters } from "@/types";
import { recordingService } from "@/services/recordingService";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";
import { applyGuestFilters } from "@/utils/exploreGuestFilters";
import { semanticSearchService } from "@/services/semanticSearchService";

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
        // Phase : Always hit the real API first for semantic search!
        // The API might not filter fully if we're not authenticated, but since search/semantic
        // is available, we pass it first, and fallback if necessary.
        const semanticResponse = await semanticSearchService.searchSemantic({ q: sqActive, topK: 10 });
        const ranked = semanticResponse.map(r => ({ ...r.recording, _semanticScore: r.similarityScore }));
        const pooled = applyGuestFilters(ranked, facetOnly);
        response = { items: pooled, total: pooled.length, totalPages: 1 };
      } else {
        const semanticResponse = await semanticSearchService.searchSemantic({ q: sqActive, topK: 10 });
        const ranked = semanticResponse.map(r => ({ ...r.recording, _semanticScore: r.similarityScore }));
        // Note: Filters are applied locally on top of semantic response if `facetOnly` has length. 
        // Ideally backend applies filters too, but swagger shows only q, topK, minScore.
        const pooled = Object.keys(facetOnly).length > 0 ? applyGuestFilters(ranked, facetOnly) : ranked;
        response = { items: pooled, total: pooled.length, totalPages: 1 };
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
      dataSource = apiItems.length > 0 ? "searchApi" : "empty";
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
      const apiFallback = await fetchVerifiedSubmissionsAsRecordings({ signal });
      if (signal?.aborted) throw error;
      
      let localFallback: Recording[] = [];
      try {
        const { getLocalRecordingMetaList, getLocalRecordingFull } = await import("@/services/recordingStorage");
        const { migrateVideoDataToVideoData } = await import("@/utils/helpers");
        const { convertLocalToRecording } = await import("@/utils/localRecordingToRecording");
        const { ModerationStatus } = await import("@/types");

        const meta = await getLocalRecordingMetaList();
        const migrated = migrateVideoDataToVideoData(meta as import("@/types").LocalRecording[]);
        const approved = migrated.filter(
          (r) =>
            r.moderation &&
            typeof r.moderation === "object" &&
            "status" in r.moderation &&
            (r.moderation as { status?: string }).status === ModerationStatus.APPROVED,
        );
        const fullItems = await Promise.all(
          approved.map((r) => getLocalRecordingFull(r.id ?? "")),
        );
        const locals = fullItems.filter((r) => r != null);
        localFallback = await Promise.all(locals.map((r) => convertLocalToRecording(r as unknown as import("@/types").LocalRecording)));
      } catch (e) {
        console.warn("Local fallback failed", e);
      }

      const combined = [...apiFallback, ...localFallback];
      const uniqueFallbackMap = new Map<string, Recording>();
      for (const r of combined) {
        if (r.id && !uniqueFallbackMap.has(r.id)) {
          uniqueFallbackMap.set(r.id, r);
        }
      }
      const uniqueFallback = Array.from(uniqueFallbackMap.values());

      const activeFilters = exploreMode === "semantic" ? facetOnly : filters;
      const filteredFallback = !isAuthenticated ? applyGuestFilters(uniqueFallback, activeFilters) : uniqueFallback;
      if (exploreMode === "semantic" && sqActive) {
        // Fallback: No local semantic ranking either since we removed it, so we fallback to guest items
        // or just apply an empty array as fallback. We can't query embeddings offline.
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
