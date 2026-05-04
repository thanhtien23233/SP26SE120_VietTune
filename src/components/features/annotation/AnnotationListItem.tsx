import { Pencil, Trash2 } from 'lucide-react';

import type { AnnotationDto } from '@/types/annotation';
import { ANNOTATION_TYPE_LABELS } from '@/types/annotation';
import { formatSecondsToTime, isLikelyHttpUrl } from '@/utils/annotationHelpers';

export interface AnnotationListItemProps {
  item: AnnotationDto;
  expertId: string;
  canEdit: boolean;
  isAdmin: boolean;
  onEdit: (item: AnnotationDto) => void;
  onDelete: (item: AnnotationDto) => void;
}

export default function AnnotationListItem({
  item,
  expertId,
  canEdit,
  isAdmin,
  onEdit,
  onDelete,
}: AnnotationListItemProps) {
  const typeLabel = ANNOTATION_TYPE_LABELS[item.type ?? ''] ?? item.type ?? 'Khác';
  const ownItem = item.expertId === expertId;
  const canEditThis = ownItem || isAdmin;
  const hasRange = item.timestampStart != null || item.timestampEnd != null;

  return (
    <li className="rounded-xl border border-neutral-200 bg-surface-panel p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-800">
            {typeLabel}
          </span>
          {hasRange && (
            <span className="text-xs text-neutral-600">
              {formatSecondsToTime(item.timestampStart ?? null)} -{' '}
              {formatSecondsToTime(item.timestampEnd ?? null)}
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            {canEditThis && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Sửa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                void onDelete(item);
              }}
              disabled={!ownItem}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa
            </button>
          </div>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-neutral-900">{item.content || '(Không có nội dung)'}</p>
      {item.researchCitation && (
        <p className="mt-2 text-xs text-neutral-700">
          Trích dẫn:{' '}
          {isLikelyHttpUrl(item.researchCitation) ? (
            <a
              href={item.researchCitation}
              target="_blank"
              rel="noreferrer"
              className="text-primary-700 hover:text-primary-800 underline"
            >
              {item.researchCitation}
            </a>
          ) : (
            <span className="font-medium">{item.researchCitation}</span>
          )}
        </p>
      )}
    </li>
  );
}
