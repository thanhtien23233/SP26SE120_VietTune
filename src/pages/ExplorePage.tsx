import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search, Sparkles, Music, ArrowRight } from "lucide-react";
import BackButton from "@/components/common/BackButton";
import SearchBar from "@/components/features/SearchBar";
import RecordingCard from "@/components/features/RecordingCard";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Recording, SearchFilters, Region, RecordingType, VerificationStatus } from "@/types";
import { recordingService } from "@/services/recordingService";
import { fetchVerifiedSubmissionsAsRecordings } from "@/services/researcherArchiveService";


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

/**
 * Explore: latest approved recordings (contributor + expert moderation).
 * UI/UX aligned with SemanticSearchPage; search filter via SearchBar.
 */
export default function ExplorePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = location.pathname + location.search;

  const initialFiltersFromUrl = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(initialFiltersFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      let response: ApiResponseType;
      if (Object.keys(filters).length > 0) {
        const res = await recordingService.searchRecordings(filters, currentPage, 20);
        response = res as ApiResponseType;
      } else {
        const res = await recordingService.getRecordings(currentPage, 20);
        response = res as ApiResponseType;
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
        const sorted = [...fallback].sort(
          (a, b) =>
            new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
        );
        setRecordings(sorted.slice(0, 20));
        setTotalResults(sorted.length);
      } catch {
        setRecordings([]);
        setTotalResults(0);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

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
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordings.map((r) => (
                  <li key={r.id}>
                    <RecordingCard recording={r} linkState={{ from: returnTo }} />
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
