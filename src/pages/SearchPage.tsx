import { Search, Sparkles, Download } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import AudioPlayer from '@/components/features/AudioPlayer';
import ExportDatasetDialog from '@/components/features/research/ExportDatasetDialog';
import SearchBar from '@/components/features/SearchBar';
import VideoPlayer from '@/components/features/VideoPlayer';
import { recordingService } from '@/services/recordingService';
import { Recording, SearchFilters, Region, RecordingType, VerificationStatus } from '@/types';
import { cn } from '@/utils/helpers';
import { SURFACE_CARD } from '@/utils/surfaceTokens';
import { isYouTubeUrl } from '@/utils/youtube';

// Build SearchFilters from URL search params (restore filter state from shareable links)
function filtersFromSearchParams(searchParams: URLSearchParams): SearchFilters {
  const q = searchParams.get('q')?.trim();
  const region = searchParams.get('region');
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const tagsParam = searchParams.get('tags');

  const filters: SearchFilters = {};
  if (q) filters.query = q;
  if (region && Object.values(Region).includes(region as Region)) {
    filters.regions = [region as Region];
  }
  if (type && Object.values(RecordingType).includes(type as RecordingType)) {
    filters.recordingTypes = [type as RecordingType];
  }
  if (status && Object.values(VerificationStatus).includes(status as VerificationStatus)) {
    filters.verificationStatus = [status as VerificationStatus];
  }
  if (from) filters.dateFrom = from;
  if (to) filters.dateTo = to;
  if (tagsParam) {
    filters.tags = tagsParam
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return filters;
}

// Build URL search params from SearchFilters for shareable links
function searchParamsFromFilters(filters: SearchFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.query) params.q = filters.query;
  if (filters.regions?.length) params.region = filters.regions[0];
  if (filters.recordingTypes?.length) params.type = filters.recordingTypes[0];
  if (filters.verificationStatus?.length) params.status = filters.verificationStatus[0];
  if (filters.dateFrom) params.from = filters.dateFrom;
  if (filters.dateTo) params.to = filters.dateTo;
  if (filters.tags?.length) params.tags = filters.tags.join(',');
  return params;
}

export default function SearchPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = location.pathname + location.search;

  const initialFiltersFromUrl = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(
    () => Object.keys(initialFiltersFromUrl).length > 0,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>(initialFiltersFromUrl);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const searchSurfaceClassName = cn(
    SURFACE_CARD,
    'rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl',
  );

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      type ApiResponseType = { items: Recording[]; total: number; totalPages: number };
      let response: ApiResponseType | unknown;
      if (Object.keys(filters).length > 0) {
        response = await recordingService.searchRecordings(filters, currentPage, 20);
      } else {
        response = await recordingService.getRecordings(currentPage, 20);
      }

      const apiItems =
        response && Array.isArray((response as ApiResponseType).items)
          ? (response as ApiResponseType).items
          : [];

      setRecordings(apiItems);
      setTotalPages((response as ApiResponseType)?.totalPages ?? 1);
      const apiTotal =
        response && typeof (response as ApiResponseType).total === 'number'
          ? (response as ApiResponseType).total
          : apiItems.length;
      setTotalResults(apiTotal);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setRecordings([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    if (hasSearched) {
      void fetchRecordings();
    }
  }, [fetchRecordings, hasSearched]);

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setHasSearched(true);
    const params = searchParamsFromFilters(newFilters);
    setSearchParams(Object.keys(params).length > 0 ? params : {}, { replace: true });
  };

  // Sync filters from URL when user navigates (e.g. browser back/forward) so filter search stays restored
  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    setFilters(next);
    setCurrentPage(1);
    setHasSearched(Object.keys(next).length > 0);
  }, [searchParams]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — wraps on small screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Tìm kiếm bài hát
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

        {/* Main Search Form — same card style as SemanticSearchPage */}
        <div
          className={cn(searchSurfaceClassName, 'p-8 mb-8')}
        >
          <SearchBar onSearch={handleSearch} initialFilters={filters} />
        </div>

        {/* Search Results — same card style as SemanticSearchPage */}
        {hasSearched && (
          <div
            className={cn(searchSurfaceClassName, 'p-8 mb-8')}
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
              <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
              </div>
              Kết quả tìm kiếm
            </h2>

            {/* Results Content — same structure as SemanticSearchPage empty/loading */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="py-10 text-center">
                <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                  Không tìm thấy bản thu
                </h3>
                <p className="text-neutral-600 font-medium leading-relaxed max-w-md mx-auto mb-4">
                  Thử thay đổi từ khóa hoặc bộ lọc để tìm kiếm kết quả phù hợp hơn. Bạn cũng có thể
                  dùng Tìm theo ý nghĩa.
                </p>
                <Link
                  to="/semantic-search"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                >
                  Tìm theo ý nghĩa
                  <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <p className="text-neutral-700 font-medium leading-relaxed">
                    Tìm thấy {totalResults} bản thu
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowExportDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary-300/80 bg-primary-50/90 text-primary-700 hover:bg-primary-100/90 font-medium transition-all duration-200 cursor-pointer focus:outline-none"
                  >
                    <Download className="h-4 w-4" strokeWidth={2.5} />
                    Xuất dữ liệu
                  </button>
                </div>
                <div className="space-y-4 mb-8">
                  {recordings.map((recording, idx) => {
                    try {
                      // For API recordings, check if it's video/YouTube
                      const apiSrc =
                        typeof recording.audioUrl === 'string' ? recording.audioUrl : '';
                      const isApiVideo =
                        apiSrc &&
                        (isYouTubeUrl(apiSrc) ||
                          apiSrc.match(/\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)$/i));

                      return isApiVideo ? (
                        <VideoPlayer
                          key={recording.id || `api-${idx}`}
                          src={apiSrc}
                          title={recording.title}
                          artist={recording.titleVietnamese}
                          recording={recording}
                          showContainer={true}
                          returnTo={returnTo}
                        />
                      ) : (
                        <AudioPlayer
                          key={recording.id || `api-${idx}`}
                          src={apiSrc}
                          title={recording.title}
                          artist={recording.titleVietnamese}
                          recording={recording}
                          showContainer={true}
                          returnTo={returnTo}
                        />
                      );
                    } catch (err) {
                      console.error('Error rendering recording:', err, recording);
                      return (
                        <div
                          key={recording.id || `err-${idx}`}
                          className="border border-red-200 rounded-xl p-6 text-center text-red-600"
                        >
                          <p>Có lỗi khi hiển thị bản thu.</p>
                        </div>
                      );
                    }
                  })}
                </div>

                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Initial State - Search Tips */}
        {!hasSearched && (
          <div
            className={cn(searchSurfaceClassName, 'p-8 mb-8')}
          >
            <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
              <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
                <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
              </div>
              Mẹo tìm kiếm
            </h2>
            <ul className="space-y-3 text-neutral-700 font-medium leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-primary-600 flex-shrink-0">•</span>
                <span>Sử dụng từ khóa cụ thể như tên bài hát, nghệ nhân, hoặc nhạc cụ</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-600 flex-shrink-0">•</span>
                <span>Kết hợp nhiều bộ lọc để thu hẹp kết quả tìm kiếm</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-600 flex-shrink-0">•</span>
                <span>Thử tìm theo vùng miền hoặc dân tộc để khám phá âm nhạc đặc trưng</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-600 flex-shrink-0">•</span>
                <span>Bộ lọc "Đã xác minh" giúp tìm các bản thu đã được kiểm chứng</span>
              </li>
            </ul>
          </div>
        )}
        <ExportDatasetDialog
          open={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          recordings={recordings}
        />
      </div>
    </div>
  );
}
