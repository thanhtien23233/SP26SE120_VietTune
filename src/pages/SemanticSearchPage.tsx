import { Sparkles, Search, Music, ArrowRight } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import RecordingCard from '@/components/features/RecordingCard';
import { recordingService } from '@/services/recordingService';
import { Recording } from '@/types';

const SUGGESTED_QUERIES = [
  'dân ca quan họ Bắc Ninh',
  'nhạc cụ đàn bầu đàn tranh',
  'hát then dân tộc Tày',
  'ca trù Hà Nội',
  'hò ví giặm Nghệ Tĩnh',
  'cồng chiêng Tây Nguyên',
  'chầu văn hầu bóng',
  'đờn ca tài tử Nam Bộ',
];

/**
 * Semantic Search: find recordings by natural language / meaning.
 * UI/UX aligned with UploadPage and UploadMusic (same layout, header, card style).
 */
export default function SemanticSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const qFromUrl = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(qFromUrl);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Recording[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [allRecordings, setAllRecordings] = useState<Recording[]>([]);
  const returnTo = location.pathname + location.search;
  const hasRestoredRef = useRef(false);

  const tokenize = useCallback((text: string): string[] => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .split(/\s+/)
      .filter(Boolean);
  }, []);

  const scoreRecording = useCallback((r: Recording, tokens: string[]): number => {
    const title = (r.title || '') + ' ' + (r.titleVietnamese || '');
    const desc = r.description || '';
    const ethnicityName =
      typeof r.ethnicity === 'object' && r.ethnicity !== null
        ? (r.ethnicity.name || '') + ' ' + (r.ethnicity.nameVietnamese || '')
        : '';
    const tags = (r.tags || []).join(' ');
    const searchable = [title, desc, ethnicityName, tags]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    let score = 0;
    for (const t of tokens) {
      if (searchable.includes(t)) score += 1;
    }
    return score;
  }, []);

  const runSearchWithQuery = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setSearchParams({ q: trimmed }, { replace: true });
      setIsSearching(true);
      setHasSearched(true);
      const tokens = tokenize(trimmed);
      const scored = allRecordings
        .map((r) => ({ r, score: scoreRecording(r, tokens) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.r);
      setResults(scored);
      setIsSearching(false);
    },
    [allRecordings, tokenize, scoreRecording, setSearchParams],
  );

  const runSearch = useCallback(() => {
    runSearchWithQuery(query);
  }, [query, runSearchWithQuery]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let apiItems: Recording[] = [];
      try {
        const res = await recordingService.getRecordings(1, 500);
        apiItems = Array.isArray(res?.items) ? res.items : [];
      } catch (err) {
        console.error('Failed to fetch recordings for semantic search:', err);
      }
      if (cancelled) return;
      setAllRecordings(apiItems);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore query from URL on mount or when URL changes (e.g. when returning from detail)
  useEffect(() => {
    if (qFromUrl && query !== qFromUrl) {
      setQuery(qFromUrl);
    }
  }, [qFromUrl, query]);

  // When we have URL query and recordings loaded, run search once to restore results (e.g. after back from detail)
  useEffect(() => {
    if (!qFromUrl.trim() || allRecordings.length === 0 || hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    try {
      runSearchWithQuery(qFromUrl.trim());
    } catch (err) {
      hasRestoredRef.current = false;
      console.error('SemanticSearchPage restore search failed:', err);
    }
  }, [qFromUrl, allRecordings.length, runSearchWithQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header — responsive; wraps on small screens */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 min-w-0">
            Tìm theo ý nghĩa
          </h1>
          <BackButton />
        </div>

        {/* Main search card — same style as UploadPage main form card */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
              <Sparkles className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            Mô tả bằng ngôn ngữ tự nhiên
          </h2>
          <p className="text-neutral-600 font-medium leading-relaxed mb-4">
            Viết câu hỏi hoặc mô tả bản thu bạn muốn tìm. Hệ thống sẽ gợi ý bản ghi phù hợp theo
            nghĩa.
          </p>

          <div
            className="relative w-full min-h-[48px] px-4 py-2.5 border border-neutral-400/80 rounded-xl focus-within:border-primary-500 focus-within:border-transparent transition-all duration-200 shadow-sm hover:shadow-md mb-4 bg-surface-panel"
          >
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500"
              strokeWidth={2}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ví dụ: bản thu dân ca quan họ, nhạc đàn bầu miền Bắc,..."
              className="w-full pl-12 pr-32 py-2 bg-transparent text-neutral-900 placeholder-neutral-500 focus:outline-none rounded-xl"
              aria-label="Câu hỏi tìm kiếm theo nghĩa"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={isSearching || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium rounded-xl transition-colors duration-200 flex items-center gap-2 cursor-pointer"
            >
              {isSearching ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Tìm kiếm
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-neutral-500">
            Gợi ý: Nhấn vào một gợi ý tìm kiếm bên dưới để tìm nhanh
          </p>
        </div>

        {/* Suggested queries — same card style as UploadPage guidelines block */}
        <div
          className="border border-neutral-200/80 rounded-2xl p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl mb-8 bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
              <Search className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            Gợi ý tìm kiếm
          </h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  runSearchWithQuery(s);
                }}
                className="px-4 py-2 rounded-xl border border-neutral-400/80 text-neutral-900 font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer focus:outline-none focus:border-primary-500 bg-surface-panel hover:bg-cream-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results — same card style */}
        <div
          className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 mb-8 transition-all duration-300 hover:shadow-xl bg-surface-panel"
        >
          <h2 className="text-2xl font-semibold mb-4 text-neutral-900 flex items-center gap-3">
            <div className="p-2 bg-primary-100/90 rounded-lg shadow-sm">
              <Music className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
            </div>
            Kết quả
          </h2>

          {hasSearched ? (
            <>
              {isSearching ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : results.length === 0 ? (
                <div className="py-10 text-center">
                  <Music className="h-12 w-12 text-neutral-400 mx-auto mb-4" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">
                    Chưa có kết quả phù hợp
                  </h3>
                  <p className="text-neutral-600 font-medium leading-relaxed max-w-md mx-auto mb-4">
                    Thử đổi cách diễn đạt hoặc chọn một gợi ý ở trên. Bạn cũng có thể dùng trang Tìm
                    kiếm với bộ lọc chi tiết.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/search')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white font-medium transition-all duration-300 shadow-xl hover:shadow-2xl shadow-primary-600/40 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
                  >
                    Đến trang Tìm kiếm
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-neutral-700 font-medium leading-relaxed mb-4">
                    Tìm thấy {results.length} bản ghi
                  </p>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {results
                      .filter((r) => r?.id)
                      .map((r) => (
                        <li key={r.id}>
                          <RecordingCard recording={r} linkState={{ from: returnTo }} />
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center border border-dashed border-neutral-300/80 rounded-xl">
              <Sparkles className="h-10 w-10 text-primary-500/80 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-neutral-600 font-medium leading-relaxed">
                Nhập câu hỏi hoặc nhấn vào một gợi ý để bắt đầu tìm theo ý nghĩa.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
