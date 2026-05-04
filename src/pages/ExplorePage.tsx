import { Search, Music, ArrowRight, ListFilter, X } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ExploreResultRow from '@/components/features/ExploreResultRow';
import ExploreSearchHeader, {
  type ExploreSearchMode,
} from '@/components/features/ExploreSearchHeader';
import FilterSidebar from '@/components/features/FilterSidebar';
import { EXPLORE_FILTER_OPTIONS } from '@/constants/exploreFilterOptions';
import { useAuth } from '@/contexts/AuthContext';
import {
  createEmptyExploreFacetDraft,
  exploreDraftToSearchFilters,
  searchFiltersToExploreDraft,
  type ExploreFacetDraft,
} from '@/features/explore/utils/exploreFacetDraft';
import { useDebounce } from '@/hooks/useDebounce';
import { useExploreData } from '@/hooks/useExploreData';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SearchFilters, Region, RecordingType, VerificationStatus } from '@/types';
import { cn } from '@/utils/helpers';
import { SURFACE_PANEL_GRADIENT } from '@/utils/surfaceTokens';

const EXPLORE_PAGE_SIZE = 20;

function filtersFromSearchParams(searchParams: URLSearchParams): SearchFilters {
  const q = searchParams.get('q')?.trim();
  const region = searchParams.get('region');
  const typeParam = searchParams.get('type');
  const status = searchParams.get('status');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const tagsParam = searchParams.get('tags');
  const ethnicityParam = searchParams.get('ethnicity');
  const filters: SearchFilters = {};
  if (q) filters.query = q;
  if (region && Object.values(Region).includes(region as Region))
    filters.regions = [region as Region];
  if (typeParam) {
    const parts = typeParam
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const valid = parts.filter((p): p is RecordingType =>
      Object.values(RecordingType).includes(p as RecordingType),
    );
    if (valid.length) filters.recordingTypes = valid;
  }
  if (status && Object.values(VerificationStatus).includes(status as VerificationStatus))
    filters.verificationStatus = [status as VerificationStatus];
  if (from) filters.dateFrom = from;
  if (to) filters.dateTo = to;
  if (tagsParam)
    filters.tags = tagsParam
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  if (ethnicityParam) {
    filters.ethnicityIds = ethnicityParam
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return filters;
}

function searchParamsFromFilters(filters: SearchFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.query) params.q = filters.query;
  if (filters.regions?.length) params.region = filters.regions[0];
  if (filters.recordingTypes?.length) params.type = filters.recordingTypes.join(',');
  if (filters.verificationStatus?.length) params.status = filters.verificationStatus[0];
  if (filters.dateFrom) params.from = filters.dateFrom;
  if (filters.dateTo) params.to = filters.dateTo;
  if (filters.tags?.length) params.tags = filters.tags.join(',');
  if (filters.ethnicityIds?.length) params.ethnicity = filters.ethnicityIds.join(',');
  return params;
}

function buildExploreSearchParams(
  filters: SearchFilters,
  mode: ExploreSearchMode,
  semanticSq: string,
): URLSearchParams {
  const base = searchParamsFromFilters(filters);
  const p = new URLSearchParams();
  Object.entries(base).forEach(([k, v]) => p.set(k, v));
  if (mode === 'semantic') p.set('mode', 'semantic');
  else p.delete('mode');
  const sem = semanticSq.trim();
  if (sem) p.set('sq', sem);
  else p.delete('sq');
  return p;
}

/**
 * Explore — Phase 5 data model (URL = applied state):
 * - `searchMode` → URL `mode` (`keyword` | `semantic`).
 * - Keyword query → `filters.query` / `q`; semantic text → `sq` (applied when user submits).
 * - `facetDraft` = pending sidebar edits until **Áp dụng** commits to URL → `filters`.
 * - `currentPage` = pagination (guest semantic path ignores page on pool fetch).
 */
export default function ExplorePage() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = location.pathname + location.search;

  const initialFiltersFromUrl = useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState<SearchFilters>(initialFiltersFromUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [facetDraft, setFacetDraft] = useState<ExploreFacetDraft>(() =>
    searchFiltersToExploreDraft(initialFiltersFromUrl, EXPLORE_FILTER_OPTIONS),
  );
  const sqFromUrl = searchParams.get('sq') ?? '';
  const [semanticInput, setSemanticInput] = useState(sqFromUrl);
  const debouncedSemanticInput = useDebounce(semanticInput, 600);

  const exploreMode: ExploreSearchMode =
    searchParams.get('mode') === 'semantic' ? 'semantic' : 'keyword';

  const { recordings, loading, totalResults, searchError, setSearchError } = useExploreData({
    currentPage,
    exploreMode,
    filters,
    sqFromUrl,
    isAuthenticated,
  });

  const isNarrowViewport = useMediaQuery('(max-width: 1023px)');
  const filterDrawerTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDrawerCloseRef = useRef<HTMLButtonElement>(null);
  const resultsTopRef = useRef<HTMLDivElement>(null);

  const closeFilterDrawer = useCallback(() => {
    setFilterDrawerOpen(false);
    queueMicrotask(() => filterDrawerTriggerRef.current?.focus());
  }, []);

  useEffect(() => {
    setSemanticInput(sqFromUrl);
  }, [sqFromUrl]);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilterDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterDrawerOpen, closeFilterDrawer]);

  useEffect(() => {
    if (!filterDrawerOpen || !isNarrowViewport) return;
    const id = requestAnimationFrame(() => filterDrawerCloseRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [filterDrawerOpen, isNarrowViewport]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) setFilterDrawerOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!filterDrawerOpen) return;
    const narrow = window.matchMedia('(max-width: 1023px)');
    if (!narrow.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filterDrawerOpen]);

  const handleSearch = useCallback(
    (newFilters: SearchFilters) => {
      setFilters(newFilters);
      setCurrentPage(1);
      const mode = searchParams.get('mode') === 'semantic' ? 'semantic' : 'keyword';
      const sq = searchParams.get('sq') ?? '';
      setSearchParams(buildExploreSearchParams(newFilters, mode, sq), { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleFilterSearch = useCallback(
    (newFilters: SearchFilters) => {
      handleSearch(newFilters);
      setFilterDrawerOpen(false);
    },
    [handleSearch],
  );

  const submitKeywordSearch = useCallback(() => {
    const next = exploreDraftToSearchFilters(facetDraft);
    setCurrentPage(1);
    setSearchParams(buildExploreSearchParams(next, 'keyword', ''), { replace: true });
  }, [facetDraft, setSearchParams]);

  const submitSemanticSearch = useCallback(() => {
    const next: SearchFilters = { ...filters };
    delete next.query;
    setCurrentPage(1);
    setSearchParams(buildExploreSearchParams(next, 'semantic', semanticInput), { replace: true });
  }, [filters, semanticInput, setSearchParams]);

  useEffect(() => {
    if (exploreMode === 'semantic' && debouncedSemanticInput !== sqFromUrl) {
      if (debouncedSemanticInput.trim() !== '' || sqFromUrl !== '') {
        const next: SearchFilters = { ...filters };
        delete next.query;
        setCurrentPage(1);
        setSearchParams(buildExploreSearchParams(next, 'semantic', debouncedSemanticInput), {
          replace: true,
        });
      }
    }
  }, [debouncedSemanticInput, exploreMode, sqFromUrl, filters, setSearchParams]);

  const onExploreModeChange = useCallback(
    (m: ExploreSearchMode) => {
      setCurrentPage(1);
      setSearchParams(buildExploreSearchParams(filters, m, semanticInput), { replace: true });
    },
    [filters, semanticInput, setSearchParams],
  );

  const clearAllExplore = useCallback(() => {
    setFacetDraft(createEmptyExploreFacetDraft());
    setSemanticInput('');
    setSearchError(null);
    setSearchParams({}, { replace: true });
  }, [setSearchError, setSearchParams]);

  useEffect(() => {
    const next = filtersFromSearchParams(searchParams);
    setFilters(next);
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    if (currentPage <= 1) return;
    resultsTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage]);

  useEffect(() => {
    setFacetDraft(searchFiltersToExploreDraft(filters, EXPLORE_FILTER_OPTIONS));
  }, [filters]);

  const hasFilters = Object.keys(filters).length > 0;
  const hasSemanticQuery = sqFromUrl.trim().length > 0;
  const filterBadgeActive = hasFilters || hasSemanticQuery;
  const totalPages = Math.max(1, Math.ceil(totalResults / EXPLORE_PAGE_SIZE));

  const deferredRecordings = useDeferredValue(recordings);

  const handleFacetApply = useCallback(() => {
    const next = exploreDraftToSearchFilters(facetDraft);
    if (exploreMode === 'semantic') delete next.query;
    handleFilterSearch(next);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setFilterDrawerOpen(false);
      queueMicrotask(() => filterDrawerTriggerRef.current?.focus());
    }
  }, [exploreMode, facetDraft, handleFilterSearch]);

  const handleFacetReset = useCallback(() => {
    clearAllExplore();
    setFilterDrawerOpen(false);
    queueMicrotask(() => filterDrawerTriggerRef.current?.focus());
  }, [clearAllExplore]);

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — responsive; wraps on small screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Khám phá âm nhạc dân tộc
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <BackButton />
          </div>
        </div>

        {/* Mobile / tablet: open filter drawer */}
        <div className="mb-4 flex lg:hidden">
          <button
            ref={filterDrawerTriggerRef}
            type="button"
            id="explore-filter-drawer-trigger"
            aria-expanded={filterDrawerOpen}
            aria-controls="explore-filter-drawer"
            onClick={() => setFilterDrawerOpen(true)}
            className="inline-flex items-center gap-2 min-h-[44px] rounded-xl border border-secondary-300/70 bg-gradient-to-br from-secondary-100 to-secondary-200/70 px-4 py-2 text-sm font-semibold text-primary-900 shadow-sm transition-colors hover:from-secondary-200 hover:to-secondary-300/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-400"
          >
            <ListFilter
              className="h-5 w-5 shrink-0 text-primary-600"
              strokeWidth={2.25}
              aria-hidden
            />
            Bộ lọc
            {filterBadgeActive ? (
              <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                Đang bật
              </span>
            ) : null}
          </button>
        </div>

        {filterDrawerOpen ? (
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-[2px] lg:hidden"
            onClick={closeFilterDrawer}
          />
        ) : null}

        {/* Phase 1: desktop = filter column (left) + results (right); mobile = drawer for filters */}
        <div className="lg:grid lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start">
          <aside
            id="explore-filter-drawer"
            className={cn(
              'flex min-h-0 max-h-[min(100vh-6rem,56rem)] flex-col overflow-hidden rounded-2xl border border-secondary-200/50 bg-gradient-to-b from-surface-panel to-secondary-50/55 p-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-secondary-300/50 hover:shadow-xl sm:p-8 lg:max-h-[calc(100vh-7rem)]',
              'lg:sticky lg:top-24 lg:self-start',
              'max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-50 max-lg:h-full max-lg:max-h-none max-lg:max-w-[min(100vw,22rem)] max-lg:w-full max-lg:rounded-none max-lg:rounded-l-2xl max-lg:border-y-0 max-lg:border-r-0',
              filterDrawerOpen
                ? 'max-lg:translate-x-0 max-lg:pointer-events-auto'
                : 'max-lg:translate-x-full max-lg:pointer-events-none',
              'max-lg:transition-transform max-lg:duration-200 max-lg:ease-out',
            )}
            aria-hidden={isNarrowViewport && !filterDrawerOpen ? true : undefined}
            {...(isNarrowViewport && filterDrawerOpen
              ? ({
                  role: 'dialog',
                  'aria-modal': true,
                  'aria-labelledby': 'explore-filter-drawer-title',
                } as const)
              : {})}
          >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
              <h2
                id="explore-filter-drawer-title"
                className="flex min-w-0 items-center gap-2 text-xl font-semibold text-neutral-900 sm:gap-3 sm:text-2xl"
              >
                <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-100/95 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/50">
                  <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="leading-tight">Bộ lọc tìm kiếm</span>
              </h2>
              <button
                ref={filterDrawerCloseRef}
                type="button"
                className="shrink-0 rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 lg:hidden"
                onClick={closeFilterDrawer}
                aria-label="Đóng bộ lọc"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
            <p className="mb-4 shrink-0 text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
              Chọn tiêu chí trong từng nhóm, sau đó nhấn{' '}
              <strong className="font-semibold text-neutral-800">Áp dụng</strong> để lọc kết quả.
            </p>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <FilterSidebar
                options={EXPLORE_FILTER_OPTIONS}
                selected={facetDraft}
                onChange={setFacetDraft}
                onApply={handleFacetApply}
                onReset={handleFacetReset}
              />
            </div>
          </aside>

          <main className="min-w-0 lg:mt-0 mt-2">
            <ExploreSearchHeader
              mode={exploreMode}
              onModeChange={onExploreModeChange}
              keywordValue={facetDraft.query}
              onKeywordChange={(q) => setFacetDraft((d) => ({ ...d, query: q }))}
              onKeywordSubmit={submitKeywordSearch}
              semanticValue={semanticInput}
              onSemanticChange={setSemanticInput}
              onSemanticSubmit={submitSemanticSearch}
              keywordBusy={loading && exploreMode === 'keyword'}
              semanticBusy={loading && exploreMode === 'semantic'}
            />
            <div
              ref={resultsTopRef}
              className={cn(SURFACE_PANEL_GRADIENT, 'p-6 sm:p-8 mb-8 lg:mb-0')}
              aria-live="polite"
              aria-busy={loading}
            >
              <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-primary-100/90 to-secondary-100/90 p-2 shadow-sm ring-1 ring-secondary-200/40">
                  <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} aria-hidden />
                </div>
                {exploreMode === 'semantic' && hasSemanticQuery
                  ? 'Kết quả theo ngữ nghĩa'
                  : hasFilters
                    ? 'Kết quả'
                    : 'Bản thu mới nhất'}
              </h2>

              {searchError ? (
                <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                  {searchError}
                </p>
              ) : null}

              {loading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : recordings.length === 0 ? (
                <div className="py-10 text-center">
                  <Music
                    className="h-12 w-12 text-neutral-400 mx-auto mb-4"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                    Chưa có bản thu nào
                  </h3>
                  <p className="text-neutral-600 font-medium leading-relaxed max-w-md mx-auto mb-4">
                    {exploreMode === 'semantic' && hasSemanticQuery
                      ? 'Không có bản thu khớp mô tả. Thử diễn đạt khác, nới lỏng bộ lọc, hoặc chuyển sang tìm theo từ khóa.'
                      : hasFilters || hasSemanticQuery
                        ? 'Thử thay đổi bộ lọc hoặc xóa bộ lọc để xem bản thu mới nhất.'
                        : 'Chưa có bản thu nào được kiểm duyệt.'}
                  </p>
                  {(hasFilters || hasSemanticQuery) && (
                    <button
                      type="button"
                      onClick={clearAllExplore}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
                    >
                      Xóa bộ lọc
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-neutral-700 font-medium leading-relaxed mb-4">
                    {exploreMode === 'semantic' && hasSemanticQuery
                      ? `Tìm thấy ${totalResults} bản thu phù hợp`
                      : hasFilters || hasSemanticQuery
                        ? `Tìm thấy ${totalResults} bản thu`
                        : `Có ${totalResults} bản thu đã được kiểm duyệt`}
                  </p>
                  <div className="space-y-4">
                    {deferredRecordings.map((r, idx) => (
                      <ExploreResultRow
                        key={r.id ?? `${r.title ?? 'recording'}-${idx}`}
                        recording={r}
                        returnTo={returnTo}
                        rowIndex={idx}
                      />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Trước
                      </button>
                      <span className="px-3 text-sm font-medium text-neutral-600">
                        Trang {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sau
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
