
import { format, parseISO } from 'date-fns';
import { ChevronRight, Clock, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import Button from '@/components/common/Button';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import type { KBRevision } from '@/types/knowledgeBase';

function formatWhen(raw?: string): string {
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd/MM/yyyy HH:mm');
  } catch {
    return raw;
  }
}

export interface KBRevisionHistoryProps {
  entryId: string | null;
  className?: string;
}

export default function KBRevisionHistory({ entryId, className }: KBRevisionHistoryProps) {
  const [list, setList] = useState<KBRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<KBRevision | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async () => {
    if (!entryId) {
      setList([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await knowledgeBaseApi.getRevisions(entryId);
      setList(rows);
      setSelected(null);
    } catch {
      setError('Không tải được lịch sử phiên bản.');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openRevision = async (rev: KBRevision) => {
    setDetailLoading(true);
    try {
      const full = await knowledgeBaseApi.getRevisionById(rev.id);
      setSelected(full);
    } catch {
      setSelected(rev);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!entryId) {
    return (
      <p className="rounded-xl border border-dashed border-secondary-200/80 bg-cream-50/80 px-3 py-2 text-sm text-neutral-500">
        Chọn bài viết để xem lịch sử chỉnh sửa.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-800">
          <Clock className="h-4 w-4 text-secondary-700" />
          Lịch sử phiên bản
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => void loadList()} disabled={loading}>
          Làm mới
        </Button>
      </div>
      {error && <p className="mb-2 text-xs text-primary-600">{error}</p>}
      {loading && <p className="text-sm text-neutral-500">Đang tải…</p>}
      {!loading && list.length === 0 && !error && (
        <p className="text-sm text-neutral-500">Chưa có bản ghi lịch sử.</p>
      )}
      <ul className="space-y-2">
        {list.map((rev) => (
          <li key={rev.id}>
            <button
              type="button"
              onClick={() => void openRevision(rev)}
              className="flex w-full items-center gap-2 rounded-xl border border-secondary-200/70 bg-surface-panel px-3 py-2 text-left text-sm shadow-sm transition-colors hover:bg-cream-100"
            >
              <Clock className="h-4 w-4 shrink-0 text-secondary-600" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-neutral-800">
                  {formatWhen(rev.editedAt)}
                  {rev.editedByName && (
                    <span className="text-neutral-500"> · {rev.editedByName}</span>
                  )}
                </span>
                {rev.revisionNote && (
                  <span className="block truncate text-xs text-neutral-500">{rev.revisionNote}</span>
                )}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kb-rev-title"
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-secondary-200/80 bg-surface-panel shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary-200/70 px-4 py-3">
              <h4 id="kb-rev-title" className="text-sm font-semibold text-neutral-900">
                Nội dung phiên bản
              </h4>
              <button
                type="button"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-200/60"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm text-neutral-800">
              {detailLoading && <p className="text-neutral-500">Đang tải chi tiết…</p>}
              {!detailLoading && (
                <>
                  <p className="mb-2 text-xs text-neutral-500">
                    {formatWhen(selected.editedAt)}
                    {selected.revisionNote && ` · ${selected.revisionNote}`}
                  </p>
                  <div
                    className="prose prose-sm max-w-none rounded-xl border border-secondary-100 bg-white p-3 [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: selected.content || '<p>(Trống)</p>' }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
