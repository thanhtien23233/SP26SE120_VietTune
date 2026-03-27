import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search, Sparkles, Music, ArrowRight } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import SearchBar from "@/components/features/SearchBar";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Recording, SearchFilters, Region, RecordingType, VerificationStatus } from "@/types";
import { recordingService } from "@/services/recordingService";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeSearchText } from "@/utils/searchText";
import SingleTrackPlayer from "@/components/researcher/SingleTrackPlayer";


function filtersFromSearchParams(searchParams: URLSearchParams): SearchFilters {
  const q = searchParams.get("q")?.trim();
  const region = searchParams.get("region");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const tagsParam = searchParams.get("tags");
  const filters: SearchFilters = {};
  if (q) filters.query = q;
  if (region && Object.values(Region).includes(region as Region)) filters.regions = [region as Region];
  if (type && Object.values(RecordingType).includes(type as RecordingType)) filters.recordingTypes = [type as RecordingType];
  if (status && Object.values(VerificationStatus).includes(status as VerificationStatus)) filters.verificationStatus = [status as VerificationStatus];
  if (from) filters.dateFrom = from;
  if (to) filters.dateTo = to;
  if (tagsParam) filters.tags = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
  return filters;
}

function searchParamsFromFilters(filters: SearchFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.query) params.q = filters.query;
  if (filters.regions?.length) params.region = filters.regions[0];
  if (filters.recordingTypes?.length) params.type = filters.recordingTypes[0];
  if (filters.verificationStatus?.length) params.status = filters.verificationStatus[0];
  if (filters.dateFrom) params.from = filters.dateFrom;
  if (filters.dateTo) params.to = filters.dateTo;
  if (filters.tags?.length) params.tags = filters.tags.join(",");
  return params;
}



type ApiResponseType = { items: Recording[]; total: number; totalPages: number };
type ExploreDataSource = "recordingGuest" | "recordingApi" | "searchApi" | "archiveFallback" | "empty";

function applyGuestFilters(rows: Recording[], filters: SearchFilters): Recording[] {
  const query = normalizeSearchText(filters.query ?? "");
  const selectedRegion = filters.regions?.[0];
  const selectedType = filters.recordingTypes?.[0];
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo).getTime() : null;
  const tags = (filters.tags ?? []).map((t) => normalizeSearchText(t)).filter(Boolean);

  return rows.filter((r) => {
    if (query) {
      const title = normalizeSearchText(`${r.title ?? ""} ${r.titleVietnamese ?? ""}`);
      const desc = normalizeSearchText(r.description ?? "");
      const tagText = normalizeSearchText((r.tags ?? []).join(" "));
      const haystack = `${title} ${desc} ${tagText}`;
      if (!haystack.includes(query)) return false;
    }
    if (selectedRegion && r.region !== selectedRegion) return false;
    if (selectedType && r.recordingType !== selectedType) return false;
    if (tags.length > 0) {
      const tagSet = new Set((r.tags ?? []).map((x) => normalizeSearchText(x)));
      if (!tags.every((t) => tagSet.has(t))) return false;
    }
    if (dateFrom || dateTo) {
      const ts = new Date(r.recordedDate || r.uploadedDate || 0).getTime();
      if (Number.isFinite(dateFrom) && ts < (dateFrom as number)) return false;
      if (Number.isFinite(dateTo) && ts > (dateTo as number)) return false;
    }
    return true;
  });
}

/**
 * Explore: latest approved recordings (contributor + expert moderation).
 * UI/UX aligned with SemanticSearchPage; search filter via SearchBar.
 */
export default function ExplorePage() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = location.pathname + location.search;

  const initialFiltersFromUrl = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(initialFiltersFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [dataSource, setDataSource] = useState<ExploreDataSource>("empty");

  const logExploreTelemetry = useCallback(
    (source: ExploreDataSource, count: number, extra?: Record<string, unknown>) => {
      if (!import.meta.env.DEV) return;
      console.info("[ExplorePage]", {
        source,
        count,
        isAuthenticated,
        page: currentPage,
        filters,
        ...extra,
      });
    },
    [currentPage, filters, isAuthenticated],
  );

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      let response: ApiResponseType;
      if (!isAuthenticated) {
        // Guest flow: always use dedicated public API without token.
        const guestRes = await recordingService.getGuestRecordings(currentPage, 20);
        const filteredGuestItems = applyGuestFilters(
          Array.isArray(guestRes?.items) ? guestRes.items : [],
          filters,
        );
        response = {
          items: filteredGuestItems,
          total: filteredGuestItems.length,
          totalPages: 1,
        };
        setDataSource(filteredGuestItems.length > 0 ? "recordingGuest" : "empty");
        logExploreTelemetry(filteredGuestItems.length > 0 ? "recordingGuest" : "empty", filteredGuestItems.length);
      } else if (Object.keys(filters).length > 0) {
        const res = await recordingService.searchRecordings(filters, currentPage, 20);
        response = res as ApiResponseType;
        const count = Array.isArray((res as ApiResponseType)?.items) ? (res as ApiResponseType).items.length : 0;
        setDataSource(count > 0 ? "searchApi" : "empty");
        logExploreTelemetry(count > 0 ? "searchApi" : "empty", count);
      } else {
        const res = await recordingService.getRecordings(currentPage, 20);
        response = res as ApiResponseType;
        const count = Array.isArray((res as ApiResponseType)?.items) ? (res as ApiResponseType).items.length : 0;
        setDataSource(count > 0 ? "recordingApi" : "empty");
        logExploreTelemetry(count > 0 ? "recordingApi" : "empty", count);
      }
      const apiItems = Array.isArray(response?.items) ? response.items : [];
      const apiTotal = typeof response?.total === "number" ? response.total : apiItems.length;

      const sorted = [...apiItems].sort((a, b) => new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime());

      setRecordings(sorted);
      setTotalResults(apiTotal);
    } catch (error) {
      console.error("Error fetching recordings:", error);
      // Guest fallback: still show approved archive when /Recording endpoints are restricted.
      try {
        const fallback = await fetchVerifiedSubmissionsAsRecordings();
        const filteredFallback = !isAuthenticated ? applyGuestFilters(fallback, filters) : fallback;
        const sorted = [...filteredFallback].sort(
          (a, b) =>
            new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        setRecordings(sorted.slice(0, 20));
        setTotalResults(sorted.length);
        setDataSource(sorted.length > 0 ? "archiveFallback" : "empty");
        logExploreTelemetry(sorted.length > 0 ? "archiveFallback" : "empty", sorted.length, { fallback: true });
      } catch {
        setRecordings([]);
        setTotalResults(0);
        setDataSource("empty");
        logExploreTelemetry("empty", 0, { fallback: true, failed: true });
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters, isAuthenticated, logExploreTelemetry]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    const params = searchParamsFromFilters(newFilters);
    setSearchParams(Object.keys(params).length > 0 ? params : {}, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    setFilters(next);
    setCurrentPage(1);
  }, [searchParams]);

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — responsive; wraps on small screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Khám phá âm nhạc dân tộc
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/semantic-search"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6 py-2 rounded-xl bg-primary-100/90 text-primary-700 hover:bg-primary-200/90 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 cursor-pointer focus:outline-none border border-primary-200/80 text-sm sm:text-base"
              title="Tìm theo ý nghĩa"
            >
              <Sparkles className="h-5 w-5 shrink-0" strokeWidth={2.5} />
              <span className="whitespace-nowrap">Tìm theo ý nghĩa</span>
            </Link>
            <BackButton />
          </div>
        </div>

        {/* Main Search / Filter card — same style as SemanticSearchPage */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
              <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            Bộ lọc tìm kiếm
          </h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-4">
            Lọc theo từ khóa, vùng miền, loại hình, thẻ hoặc ngày để tìm bản thu phù hợp.
          </p>
          <SearchBar onSearch={handleSearch} initialFilters={filters} />
        </div>

        {/* Results — same card style as SemanticSearchPage */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl"
          style={{ backgroundColor: "#FFFCF5" }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
              <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            {hasFilters ? "Kết quả" : "Bản thu mới nhất"}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="py-10 text-center">
              <Music className="h-12 w-12 text-neutral-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold text-neutral-800 mb-2">Chưa có bản thu nào</h3>
              <p className="text-neutral-600 font-medium leading-relaxed max-w-md mx-auto mb-4">
                {hasFilters ? "Thử thay đổi bộ lọc hoặc xóa bộ lọc để xem bản thu mới nhất." : "Chưa có bản thu nào được kiểm duyệt."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => handleSearch({})}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                >
                  Xóa bộ lọc
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-neutral-700 font-medium leading-relaxed mb-4">
                {hasFilters ? `Tìm thấy ${totalResults} bản thu` : `Có ${totalResults} bản thu đã được kiểm duyệt`}
              </p>
              <p className="text-[11px] text-neutral-500 mb-3">
                Nguồn dữ liệu:{" "}
                {dataSource === "recordingGuest"
                  ? "recordingGuest (guest)"
                  : dataSource === "searchApi"
                    ? "Search API"
                    : dataSource === "recordingApi"
                      ? "Recording API"
                      : dataSource === "archiveFallback"
                        ? "Archive fallback"
                        : "Không có dữ liệu"}
              </p>
              <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {recordings.map((r) => (
                  <li key={r.id}>
                    <SingleTrackPlayer recording={r} />
                    <div className="mt-2">
                      <Link
                        to={`/recordings/${r.id}`}
                        state={{ from: returnTo }}
                        className="inline-flex items-center rounded-lg border border-primary-200/80 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50"
                      >
                        Xem chi tiết
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
