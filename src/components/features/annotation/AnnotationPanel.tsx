import { Plus } from 'lucide-react';

import AnnotationForm from '@/components/features/annotation/AnnotationForm';
import AnnotationListItem from '@/components/features/annotation/AnnotationListItem';
import { useAnnotationForm } from '@/features/annotation/hooks/useAnnotationForm';
import { useAnnotations } from '@/features/annotation/hooks/useAnnotations';

export interface AnnotationPanelProps {
  recordingId: string;
  expertId: string;
  canEdit?: boolean;
  /** Admin có thể sửa chú thích của chuyên gia khác; expert chỉ sửa được của chính mình. */
  isAdmin?: boolean;
  className?: string;
}

export default function AnnotationPanel({
  recordingId,
  expertId,
  canEdit = true,
  isAdmin = false,
  className,
}: AnnotationPanelProps) {
  const { sortedAnnotations, loading, error, reload } = useAnnotations(recordingId);
  const {
    form,
    formErrors,
    showForm,
    editTarget,
    isSubmitting,
    resetForm,
    beginCreate,
    beginEdit,
    handleSubmit,
    handleDelete,
    patchForm,
  } = useAnnotationForm({
    recordingId,
    expertId,
    canEdit,
    isAdmin,
    onMutationSuccess: reload,
  });

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 ${className ?? ''}`}
      aria-label="Bảng chú thích học thuật"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Chú thích học thuật</h3>
          <p className="text-xs text-neutral-600">
            Đánh dấu các giải thích học thuật, dị bản hiếm và tài liệu liên quan.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={beginCreate}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm chú thích
          </button>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          Đang tải chú thích...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && sortedAnnotations.length === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          Chưa có chú thích nào cho bản thu này.
        </div>
      )}

      {!loading && !error && sortedAnnotations.length > 0 && (
        <ul className="space-y-2">
          {sortedAnnotations.map((item) => (
            <AnnotationListItem
              key={item.id}
              item={item}
              expertId={expertId}
              canEdit={canEdit}
              isAdmin={isAdmin}
              onEdit={beginEdit}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}

      {showForm && canEdit && (
        <AnnotationForm
          form={form}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          editTarget={editTarget}
          onPatchForm={patchForm}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}
    </section>
  );
}
