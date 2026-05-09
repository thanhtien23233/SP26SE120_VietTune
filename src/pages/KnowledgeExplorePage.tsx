import {
  ArrowLeft,
  BookOpen,
  Bot,
  Calendar,
  ExternalLink,
  Link2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatIsoDdMmYyyyBangkok } from '@/config/datetimeDisplay';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import type {
  ArticleSearchResult,
  KBCitation,
  KBEntry,
  KBListFilters,
} from '@/types/knowledgeBase';
import { KB_CATEGORIES, KB_CATEGORY_LABELS, KB_STATUS_MAP } from '@/types/knowledgeBase';

type Screen = 'list' | 'view';

const PAGE_SIZE = 12;
const PUBLISHED_STATUS = 1;
const SEARCH_DEBOUNCE_MS = 300;

const CATEGORY_PILLS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  ...KB_CATEGORIES.map((value) => ({ value, label: KB_CATEGORY_LABELS[value] ?? value })),
];

function stripHtmlText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function buildExcerpt(html: string, max = 160): string {
  const text = stripHtmlText(html);
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function formatDate(raw?: string): string {
  if (!raw) return '—';
  return formatIsoDdMmYyyyBangkok(raw);
}

interface ListItem {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  updatedAt?: string;
  score?: number;
  status?: number;
}

function entryToListItem(entry: KBEntry): ListItem {
  return {
    id: entry.id,
    title: entry.title,
    category: entry.category,
    excerpt: buildExcerpt(entry.content),
    updatedAt: entry.updatedAt,
    status: entry.status,
  };
}

function searchResultToListItem(result: ArticleSearchResult): ListItem | null {
  if (!result.id) return null;
  return {
    id: result.id,
    title: result.title ?? '(Không có tiêu đề)',
    category: '',
    excerpt: result.excerpt ? stripHtmlText(result.excerpt).slice(0, 220) : '',
    score: result.score,
  };
}

/**
 * Defensive unwrap cho response của getEntryById. Backend có thể trả về:
 *  - flat KBEntry: { id, title, content, ... }
 *  - wrapped envelope: { data: {...} } / { Data: {...} } / { value: {...} } / ...
 *  - null / empty body
 *
 * Trả về `KBEntry` nếu phát hiện được object có `id` + `title` (string),
 * ngược lại trả `null` để caller xử lý fallback.
 */
function unwrapKbEntry(raw: unknown): KBEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id === 'string' && typeof obj.title === 'string') {
    return raw as KBEntry;
  }
  const keys = ['data', 'Data', 'value', 'Value', 'item', 'Item', 'result', 'Result', 'entry', 'Entry'];
  for (const key of keys) {
    const inner = obj[key];
    if (inner && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>;
      if (typeof innerObj.id === 'string' && typeof innerObj.title === 'string') {
        return inner as KBEntry;
      }
    }
  }
  return null;
}

export default function KnowledgeExplorePage() {
  const navigate = useNavigate();

  const [screen, setScreen] = useState<Screen>('list');

  const [items, setItems] = useState<ListItem[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('');

  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [focusEntry, setFocusEntry] = useState<KBEntry | null>(null);
  const [focusCitations, setFocusCitations] = useState<KBCitation[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Cache full KBEntry từ list endpoint để pre-populate view ngay khi click,
  // tránh phụ thuộc 100% vào getEntryById (response shape không ổn định).
  const entryCacheRef = useRef<Map<string, KBEntry>>(new Map());

  useEffect(() => {
    const trimmed = search.trim();
    const handle = window.setTimeout(() => {
      setSearchDebounced(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (searchDebounced) {
        const res = await knowledgeBaseApi.searchKnowledgeBase(
          searchDebounced,
          category || undefined,
          page,
          PAGE_SIZE,
        );
        const rows = (res.items ?? []).map(searchResultToListItem).filter((x): x is ListItem => x != null);
        setItems(rows);
        const total = typeof res.total === 'number' ? res.total : rows.length;
        setHasNext(page * PAGE_SIZE < total);
        setIsSearchMode(true);
      } else {
        const filters: KBListFilters = {
          Page: page,
          PageSize: PAGE_SIZE,
          Status: PUBLISHED_STATUS,
          SortBy: 'UpdatedAt',
          SortOrder: 'desc',
        };
        if (category) filters.Category = category;
        const data = await knowledgeBaseApi.getEntries(filters);
        data.forEach((e) => {
          if (e?.id) entryCacheRef.current.set(e.id, e);
        });
        const rows = data.map(entryToListItem);
        setItems(rows);
        setHasNext(rows.length >= PAGE_SIZE);
        setIsSearchMode(false);
      }
    } catch {
      setError('Không tải được danh sách bài viết. Vui lòng thử lại.');
      setItems([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, category, page]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, category]);

  const handleOpenEntry = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    setScreen('view');
    setFocusCitations([]);

    // Pre-populate ngay từ cache (list mode đã fetch full KBEntry trước đó).
    // Search mode sẽ là null → spinner hiện, fetch tiếp ở dưới.
    const cached = entryCacheRef.current.get(id) ?? null;
    setFocusEntry(cached);

    try {
      const [rawEntry, citations] = await Promise.all([
        knowledgeBaseApi.getEntryById(id).catch(() => null),
        knowledgeBaseApi.getCitations(id).catch(() => [] as KBCitation[]),
      ]);
      const fresh = unwrapKbEntry(rawEntry);
      if (fresh) {
        setFocusEntry(fresh);
        entryCacheRef.current.set(id, fresh);
      } else if (!cached) {
        // Không có cache + API không trả entry hợp lệ → báo lỗi rõ ràng,
        // tránh card trống im lặng như bug ban đầu.
        setDetailError('Không tải được nội dung bài viết.');
      }
      // Có cached nhưng API không trả entry → giữ cached, không hiện lỗi.
      setFocusCitations(citations);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleAskAi = useCallback(
    (title: string) => {
      const q = `Tìm hiểu về: ${title}`;
      navigate(`/chatbot?q=${encodeURIComponent(q)}`);
    },
    [navigate],
  );

  const goBackToList = useCallback(() => {
    setScreen('list');
    setFocusEntry(null);
    setFocusCitations([]);
    setDetailError(null);
  }, []);

  const pillClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-primary-500 bg-primary-100 text-primary-800'
        : 'border-neutral-300 bg-white text-neutral-700 hover:border-secondary-400 hover:bg-cream-50'
    }`;

  const headerBlock = useMemo(
    () => (
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100/90 shadow-sm">
            <BookOpen className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 sm:text-3xl">
              Khám phá Kho Tri thức
            </h1>
            <p className="text-sm font-medium text-neutral-600">
              Duyệt và tìm hiểu các bài viết về âm nhạc truyền thống Việt Nam.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {screen === 'view' ? (
            <Button type="button" variant="outline" size="sm" onClick={goBackToList}>
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
              Về danh sách
            </Button>
          ) : (
            <BackButton to="/" />
          )}
        </div>
      </div>
    ),
    [screen, goBackToList],
  );

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {headerBlock}

        {screen === 'list' && (
          <>
            {/* Search + filters */}
            <Card
              variant="bordered"
              className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6"
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-neutral-700">
                    Tìm kiếm bài viết
                  </span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="search"
                      className="w-full rounded-full border border-neutral-300 bg-white py-2.5 pl-9 pr-3 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-primary-500"
                      placeholder="Nhạc cụ, nghi lễ, dân tộc, vùng miền..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </span>
                </label>

                <div>
                  <p className="mb-2 text-xs font-medium text-neutral-700">Danh mục</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_PILLS.map((option) => (
                      <button
                        key={option.value || 'all'}
                        type="button"
                        className={pillClass(category === option.value)}
                        onClick={() => setCategory(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isSearchMode && searchDebounced && (
                  <div className="flex items-center gap-2 rounded-xl bg-primary-50/70 px-3 py-2 text-xs text-primary-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      Kết quả tìm kiếm cho{' '}
                      <strong className="font-semibold">"{searchDebounced}"</strong>
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Results */}
            <div className="mt-6">
              {loading && (
                <div className="flex justify-center py-16">
                  <LoadingSpinner size="lg" />
                </div>
              )}

              {!loading && error && (
                <Card
                  variant="bordered"
                  className="border-red-200 bg-red-50/80 p-6 text-center"
                >
                  <p className="mb-3 text-sm font-medium text-red-800">{error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadList()}>
                    <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                    Thử lại
                  </Button>
                </Card>
              )}

              {!loading && !error && items.length === 0 && (
                <Card
                  variant="bordered"
                  className="border-secondary-200/70 bg-surface-panel p-10 text-center shadow-sm"
                >
                  <BookOpen className="mx-auto mb-3 h-12 w-12 text-primary-200" />
                  <p className="text-base font-semibold text-neutral-800">
                    Chưa có bài viết phù hợp
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {searchDebounced
                      ? 'Thử từ khóa khác hoặc bỏ bộ lọc danh mục.'
                      : 'Hiện chưa có bài viết công khai trong danh mục này.'}
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/chatbot')}
                    >
                      <Bot className="mr-1 inline h-3.5 w-3.5" />
                      Hỏi AI thay thế
                    </Button>
                  </div>
                </Card>
              )}

              {!loading && !error && items.length > 0 && (
                <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Card
                        variant="bordered"
                        className="flex h-full flex-col border-secondary-200/70 bg-surface-panel p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {item.category && (
                            <Badge variant="info" size="sm">
                              {KB_CATEGORY_LABELS[item.category] ?? item.category}
                            </Badge>
                          )}
                          {!isSearchMode && item.status === PUBLISHED_STATUS && (
                            <Badge variant="success" size="sm">
                              {KB_STATUS_MAP[PUBLISHED_STATUS]}
                            </Badge>
                          )}
                          {isSearchMode && typeof item.score === 'number' && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">
                              <Sparkles className="h-3 w-3" />
                              {Math.round(item.score * 100)}% liên quan
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleOpenEntry(item.id)}
                          className="block text-left"
                        >
                          <h2 className="line-clamp-2 text-base font-bold text-neutral-900 transition-colors hover:text-primary-700 sm:text-lg">
                            {item.title}
                          </h2>
                        </button>

                        {item.excerpt && (
                          <p className="mt-2 line-clamp-3 text-sm text-neutral-700">
                            {item.excerpt}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.updatedAt)}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-secondary-100/80 pt-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAskAi(item.title)}
                          >
                            <Bot className="mr-1 inline h-3.5 w-3.5" />
                            Hỏi AI
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => void handleOpenEntry(item.id)}
                          >
                            <BookOpen className="mr-1 inline h-3.5 w-3.5" />
                            Đọc tiếp
                          </Button>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}

              {!loading && !error && items.length > 0 && (
                <div className="mt-6 flex justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </Button>
                  <span className="flex items-center px-2 text-sm font-medium text-neutral-700">
                    Trang {page}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Sau
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {screen === 'view' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card
              variant="bordered"
              className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-6 lg:col-span-2"
            >
              {loadingDetail && (
                <div className="flex justify-center py-16">
                  <LoadingSpinner size="lg" />
                </div>
              )}

              {!loadingDetail && detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-center text-sm text-red-800">
                  {detailError}
                </div>
              )}

              {!loadingDetail && !detailError && !focusEntry && (
                <div className="rounded-xl border border-secondary-100 bg-white p-6 text-center text-sm italic text-neutral-500">
                  Không có dữ liệu bài viết.
                </div>
              )}

              {!loadingDetail && !detailError && focusEntry && (
                <>
                  <h2 className="mb-3 text-xl font-bold text-neutral-900 sm:text-2xl">
                    {focusEntry.title}
                  </h2>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="info" size="sm">
                      {KB_CATEGORY_LABELS[focusEntry.category] ?? focusEntry.category}
                    </Badge>
                    <Badge
                      variant={focusEntry.status === PUBLISHED_STATUS ? 'success' : 'secondary'}
                      size="sm"
                    >
                      {KB_STATUS_MAP[focusEntry.status] ?? focusEntry.status}
                    </Badge>
                  </div>
                  <div
                    className="prose prose-sm max-w-none rounded-2xl border border-secondary-100 bg-white p-4 text-neutral-800 [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{
                      __html:
                        focusEntry.content ||
                        '<p class="text-neutral-500">(Không có nội dung)</p>',
                    }}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={goBackToList}>
                      <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
                      Về danh sách
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleAskAi(focusEntry.title)}
                    >
                      <Bot className="mr-1 inline h-3.5 w-3.5" />
                      Hỏi AI về bài này
                    </Button>
                  </div>
                </>
              )}
            </Card>

            <div className="space-y-4">
              <Card
                variant="bordered"
                className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-5"
              >
                <h3 className="mb-3 text-sm font-semibold text-neutral-900">Thông tin</h3>
                <div className="space-y-2 rounded-xl border border-secondary-100 bg-cream-50/60 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Ngày tạo</p>
                      <p className="truncate text-neutral-900">
                        {formatDate(focusEntry?.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-neutral-500">Cập nhật</p>
                      <p className="truncate text-neutral-900">
                        {formatDate(focusEntry?.updatedAt)}
                      </p>
                    </div>
                  </div>
                  {focusEntry?.slug && (
                    <div className="flex items-start gap-2">
                      <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary-700" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-neutral-500">Slug</p>
                        <p className="truncate text-neutral-900">{focusEntry.slug}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card
                variant="bordered"
                className="border-secondary-200/70 bg-surface-panel p-4 shadow-lg sm:p-5"
              >
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Link2 className="h-4 w-4 text-primary-600" />
                  Nguồn tham khảo
                  {focusCitations.length > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                      {focusCitations.length}
                    </span>
                  )}
                </h3>

                {loadingDetail && (
                  <p className="text-xs italic text-neutral-500">Đang tải...</p>
                )}

                {!loadingDetail && focusCitations.length === 0 && (
                  <p className="text-xs italic text-neutral-500">
                    Bài viết chưa có nguồn tham khảo.
                  </p>
                )}

                {!loadingDetail && focusCitations.length > 0 && (
                  <ul className="space-y-2">
                    {focusCitations.map((c, idx) => (
                      <li
                        key={c.id || idx}
                        className="rounded-xl border border-secondary-100 bg-white p-3 text-sm"
                      >
                        <p className="text-neutral-800">{c.citation}</p>
                        {c.url && (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Mở nguồn
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
