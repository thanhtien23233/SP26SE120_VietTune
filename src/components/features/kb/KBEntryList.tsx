
import { format, parseISO } from 'date-fns';
import { BookOpen, ChevronDown, Eye, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import type { KBEntry, KBListFilters } from '@/types/knowledgeBase';
import { KB_CATEGORY_LABELS, KB_STATUS_MAP } from '@/types/knowledgeBase';

function statusVariant(s: number): 'warning' | 'success' | 'secondary' {
  if (s === 1) return 'success';
  if (s === 2) return 'secondary';
  return 'warning';
}

function formatDate(raw?: string): string {
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd/MM/yyyy HH:mm');
  } catch {
    return raw;
  }
}

export interface KBEntryListProps {
  onView?: (entry: KBEntry) => void;
  onEdit?: (entry: KBEntry) => void;
  onDelete?: (entry: KBEntry) => void;
  onChangeStatus?: (entry: KBEntry, status: number) => void;
  onCreateFirst?: () => void;
  /** Bump to trigger refetch from parent */
  refreshToken?: number;
  /** Read-only list for researcher/public browsing. */
  readOnly?: boolean;
  /** Force a fixed status filter (e.g., published only). */
  fixedStatus?: number;
}

const PAGE_SIZE = 20;

export default function KBEntryList({
  onView,
  onEdit,
  onDelete,
  onChangeStatus,
  onCreateFirst,
  refreshToken = 0,
  readOnly = false,
  fixedStatus,
}: KBEntryListProps) {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [queryKey, setQueryKey] = useState(0);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  const load = useCallback(async () => {
    void refreshToken;
    setLoading(true);
    setError(null);
    try {
      const filters: KBListFilters = {
        Page: page,
        PageSize: PAGE_SIZE,
        SortBy: 'UpdatedAt',
        SortOrder: 'desc',
      };
      if (category) filters.Category = category;
      if (fixedStatus !== undefined) {
        filters.Status = fixedStatus;
      } else if (status !== '') {
        filters.Status = Number(status);
      }
      if (search.trim()) filters.Search = search.trim();
      const data = await knowledgeBaseApi.getEntries(filters);
      setEntries(data);
    } catch {
      setError('Không tải được danh sách KB. Thử lại sau.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, status, search, refreshToken, fixedStatus]);

  useEffect(() => {
    void load();
  }, [load, queryKey]);

  const applyFilters = () => {
    setPage(1);
    setQueryKey((k) => k + 1);
  };

  const hasNext = entries.length >= PAGE_SIZE;
  const categoryPills = useMemo(
    () => [{ value: '', label: 'Tất cả' }, ...Object.entries(KB_CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))],
    [],
  );
  const statusPills = useMemo(
    () => [{ value: '', label: 'Tất cả' }, ...Object.entries(KB_STATUS_MAP).map(([k, v]) => ({ value: k, label: v }))],
    [],
  );

  const pillClass = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-primary-500 bg-primary-100 text-primary-800'
        : 'border-neutral-300 bg-white text-neutral-700 hover:border-secondary-400 hover:bg-cream-50'
    }`;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-secondary-200/70 bg-surface-panel p-4 shadow-sm">
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-700">Danh mục</p>
          <div className="flex flex-wrap gap-2">
            {categoryPills.map((option) => (
              <button
                key={option.value || 'all-category'}
                type="button"
                className={pillClass(category === option.value)}
                onClick={() => setCategory(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {!readOnly && fixedStatus === undefined && (
          <div>
            <p className="mb-2 text-xs font-medium text-neutral-700">Trạng thái</p>
            <div className="flex flex-wrap gap-2">
              {statusPills.map((option) => (
                <button
                  key={option.value || 'all-status'}
                  type="button"
                  className={pillClass(status === option.value)}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-0.5 block text-xs font-medium text-neutral-700">Tìm kiếm</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                className="w-full rounded-full border border-neutral-400/80 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 shadow-sm outline-none transition-colors focus:border-primary-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tiêu đề hoặc nội dung..."
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </span>
          </label>
          <div className="flex gap-2 md:pb-0.5">
            <Button type="button" variant="secondary" size="sm" onClick={applyFilters}>
              <Search className="mr-1 inline h-3.5 w-3.5" />
              Lọc
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQueryKey((k) => k + 1)}
              disabled={loading}
              aria-label="Làm mới"
            >
              <RefreshCw className={`inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-secondary-200/70 bg-white p-3 shadow-sm sm:p-4">
        {loading && <p className="py-8 text-center text-sm text-neutral-500">Đang tải...</p>}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-secondary-200/80 bg-cream-50/70 px-4 py-12 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-primary-200" />
            <p className="text-base font-semibold text-neutral-800">Chưa có bài viết nào</p>
            <p className="mt-1 text-sm text-neutral-500">
              {readOnly
                ? 'Hiện chưa có bài viết công khai.'
                : 'Tạo bài viết đầu tiên cho hệ thống AI.'}
            </p>
            {!readOnly && onCreateFirst && (
              <Button type="button" className="mt-4" size="sm" onClick={onCreateFirst}>
                Tạo bài viết đầu tiên
              </Button>
            )}
          </div>
        )}

        {!loading && entries.length > 0 && (
          <ul className="space-y-3">
            {entries.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-secondary-200/80 bg-surface-panel p-4 shadow-sm transition-colors hover:bg-cream-50/80"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onView?.(row)}
                  disabled={!onView}
                >
                  <p className="line-clamp-2 text-sm font-semibold text-neutral-900 sm:text-base">
                    {row.title}
                  </p>
                </button>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="sm">
                    {KB_CATEGORY_LABELS[row.category] ?? row.category}
                  </Badge>
                  {!readOnly && onChangeStatus ? (
                    <div className="relative">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStatusId((id) => (id === row.id ? null : row.id));
                        }}
                      >
                        <Badge variant={statusVariant(row.status)} size="sm">
                          {KB_STATUS_MAP[row.status] ?? `Trạng thái ${row.status}`}
                        </Badge>
                        <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
                      </button>
                      {openStatusId === row.id && (
                        <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[9rem] rounded-xl border border-secondary-200 bg-white p-1 shadow-lg">
                          {Object.entries(KB_STATUS_MAP).map(([k, label]) => (
                            <button
                              key={k}
                              type="button"
                              disabled={Number(k) === row.status}
                              className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusId(null);
                                onChangeStatus(row, Number(k));
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge variant={statusVariant(row.status)} size="sm">
                      {KB_STATUS_MAP[row.status] ?? `Trạng thái ${row.status}`}
                    </Badge>
                  )}
                  <span className="ml-auto text-xs text-neutral-500">{formatDate(row.updatedAt)}</span>
                </div>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-secondary-100/80 pt-3">
                  {onView && (
                    <button
                      type="button"
                      title="Xem"
                      className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(row);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                  {!readOnly && onEdit && (
                    <button
                      type="button"
                      title="Sửa"
                      className="rounded-full p-2 text-primary-700 transition-colors hover:bg-primary-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(row);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                  {!readOnly && onDelete && (
                    <button
                      type="button"
                      title="Xóa"
                      className="rounded-full p-2 text-red-700 transition-colors hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(row);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && entries.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </Button>
          <span className="flex items-center px-2 text-sm text-neutral-600">Trang {page}</span>
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
  );
}
