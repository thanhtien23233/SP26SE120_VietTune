import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { knowledgeBaseApi } from '@/services/knowledgeBaseApi';
import type { KBEntry } from '@/types/knowledgeBase';
import { KB_CATEGORY_LABELS, KB_STATUS_MAP } from '@/types/knowledgeBase';
import { getNormalizedApiError } from '@/uiToast';
import { getErrorMessage } from '@/utils/httpError';

export default function KbEntryPublicViewPage() {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<KBEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id?.trim()) {
      setError('Thiếu mã bài viết.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await knowledgeBaseApi.getEntryById(id);
        if (!cancelled) setEntry(data);
      } catch (e) {
        const n = getNormalizedApiError(e);
        const msg = n?.rawMessage ?? getErrorMessage(e, 'Không tải được bài viết.');
        if (!cancelled) {
          setError(msg);
          setEntry(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const statusVariant = (s: number): 'warning' | 'success' | 'secondary' => {
    if (s === 1) return 'success';
    if (s === 2) return 'secondary';
    return 'warning';
  };

  return (
    <div className="min-h-[50vh] bg-transparent py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-2 text-sm font-medium text-neutral-600">
          <Link to="/chatbot" className="text-primary-600 hover:underline">
            ← VietTune Intelligence
          </Link>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!loading && error && (
          <Card variant="bordered" className="border-red-200 bg-red-50/80 p-6 text-center">
            <p className="text-neutral-800">{error}</p>
          </Card>
        )}

        {!loading && entry && (
          <Card variant="bordered" className="border-secondary-200/70 bg-surface-panel p-6 shadow-lg">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100/90">
                <BookOpen className="h-5 w-5 text-primary-600" strokeWidth={2.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">{entry.title}</h1>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="info" size="sm">
                    {KB_CATEGORY_LABELS[entry.category] ?? entry.category}
                  </Badge>
                  <Badge variant={statusVariant(entry.status)} size="sm">
                    {KB_STATUS_MAP[entry.status] ?? entry.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div
              className="prose prose-sm max-w-none rounded-xl border border-secondary-100 bg-white p-4 text-neutral-800 [&_img]:max-w-full"
              dangerouslySetInnerHTML={{
                __html: entry.content || '<p class="text-neutral-500">(Không có nội dung)</p>',
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
