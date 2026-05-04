import {
  ANNOTATION_MAX_CITATION_LENGTH,
  ANNOTATION_MAX_CONTENT_LENGTH,
  type AnnotationFormErrors,
  type AnnotationFormState,
} from '@/features/annotation/utils/annotationFormValidation';
import type { AnnotationDto, AnnotationType } from '@/types/annotation';
import { ANNOTATION_TYPE_LABELS, ANNOTATION_TYPES } from '@/types/annotation';

export interface AnnotationFormProps {
  form: AnnotationFormState;
  formErrors: AnnotationFormErrors;
  isSubmitting: boolean;
  editTarget: AnnotationDto | null;
  onPatchForm: (patch: Partial<AnnotationFormState>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AnnotationForm({
  form,
  formErrors,
  isSubmitting,
  editTarget,
  onPatchForm,
  onSubmit,
  onCancel,
}: AnnotationFormProps) {
  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-surface-panel p-3">
      <p className="mb-3 text-sm font-semibold text-neutral-900">
        {editTarget ? 'Cập nhật chú thích' : 'Thêm chú thích mới'}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-700">
          Loại
          <select
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
            value={form.type}
            onChange={(e) => onPatchForm({ type: e.target.value as AnnotationType })}
            disabled={isSubmitting}
          >
            {ANNOTATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {ANNOTATION_TYPE_LABELS[type] ?? type}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-neutral-700">
          Trích dẫn nghiên cứu (tùy chọn)
          <input
            type="text"
            value={form.researchCitation}
            onChange={(e) => onPatchForm({ researchCitation: e.target.value })}
            maxLength={ANNOTATION_MAX_CITATION_LENGTH}
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
            placeholder="URL hoặc mô tả tài liệu"
          />
          {formErrors.researchCitation && (
            <span className="mt-1 block text-xs text-red-700">{formErrors.researchCitation}</span>
          )}
        </label>
      </div>

      <label className="mt-3 block text-xs font-medium text-neutral-700">
        Nội dung
        <textarea
          rows={4}
          value={form.content}
          onChange={(e) => onPatchForm({ content: e.target.value })}
          maxLength={ANNOTATION_MAX_CONTENT_LENGTH}
          disabled={isSubmitting}
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
          placeholder="Nhập nội dung chú thích học thuật..."
        />
        {formErrors.content && <span className="mt-1 block text-xs text-red-700">{formErrors.content}</span>}
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-neutral-700">
          Mốc bắt đầu (giây, tùy chọn)
          <input
            type="number"
            min={0}
            step={1}
            value={form.timestampStart}
            onChange={(e) => onPatchForm({ timestampStart: e.target.value })}
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
          />
          {formErrors.timestampStart && (
            <span className="mt-1 block text-xs text-red-700">{formErrors.timestampStart}</span>
          )}
        </label>
        <label className="block text-xs font-medium text-neutral-700">
          Mốc kết thúc (giây, tùy chọn)
          <input
            type="number"
            min={0}
            step={1}
            value={form.timestampEnd}
            onChange={(e) => onPatchForm({ timestampEnd: e.target.value })}
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none"
          />
          {formErrors.timestampEnd && (
            <span className="mt-1 block text-xs text-red-700">{formErrors.timestampEnd}</span>
          )}
        </label>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void onSubmit();
          }}
          disabled={isSubmitting}
          className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang lưu...' : editTarget ? 'Lưu cập nhật' : 'Lưu chú thích'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
