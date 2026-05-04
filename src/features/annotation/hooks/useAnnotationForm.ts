import { useCallback, useState } from 'react';

import {
  DEFAULT_ANNOTATION_FORM,
  toAnnotationFormState,
  validateAnnotationForm,
  type AnnotationFormErrors,
  type AnnotationFormState,
} from '@/features/annotation/utils/annotationFormValidation';
import { annotationApi } from '@/services/annotationApi';
import type { AnnotationDto, CreateAnnotationDto, UpdateAnnotationDto } from '@/types/annotation';
import { notifyLine, uiToast } from '@/uiToast';
import { toastApiError } from '@/uiToast/toastApiError';

export type UseAnnotationFormOptions = {
  recordingId: string;
  expertId: string;
  canEdit: boolean;
  isAdmin: boolean;
  onMutationSuccess: () => Promise<void>;
};

export function useAnnotationForm({
  recordingId,
  expertId,
  canEdit,
  isAdmin,
  onMutationSuccess,
}: UseAnnotationFormOptions) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AnnotationDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<AnnotationFormState>(DEFAULT_ANNOTATION_FORM);
  const [formErrors, setFormErrors] = useState<AnnotationFormErrors>({});

  const resetForm = useCallback(() => {
    setForm(DEFAULT_ANNOTATION_FORM);
    setFormErrors({});
    setEditTarget(null);
    setShowForm(false);
  }, []);

  const beginCreate = useCallback(() => {
    setEditTarget(null);
    setForm(DEFAULT_ANNOTATION_FORM);
    setFormErrors({});
    setShowForm(true);
  }, []);

  const beginEdit = useCallback(
    (item: AnnotationDto) => {
      const ownItem = item.expertId === expertId;
      if (!ownItem && !isAdmin) {
        uiToast.warning(
          notifyLine('Không đủ quyền', 'Bạn chỉ có thể sửa chú thích do chính mình tạo.'),
        );
        return;
      }
      setEditTarget(item);
      setForm(toAnnotationFormState(item));
      setFormErrors({});
      setShowForm(true);
    },
    [expertId, isAdmin],
  );

  const handleSubmit = useCallback(async () => {
    if (!canEdit || isSubmitting) return;
    const parsed = validateAnnotationForm(form);
    if (!parsed.ok) {
      setFormErrors(parsed.errors);
      return;
    }
    setIsSubmitting(true);
    try {
      if (editTarget) {
        const authorId = String(editTarget.expertId ?? '').trim() || expertId;
        const payload: UpdateAnnotationDto = {
          id: editTarget.id,
          recordingId,
          expertId: authorId,
          ...parsed.payload,
        };
        await annotationApi.update(payload);
        uiToast.success(notifyLine('Thành công', 'Đã cập nhật chú thích.'));
      } else {
        const payload: CreateAnnotationDto = {
          recordingId,
          expertId,
          ...parsed.payload,
        };
        await annotationApi.create(payload);
        uiToast.success(notifyLine('Thành công', 'Đã tạo chú thích mới.'));
      }
      await onMutationSuccess();
      resetForm();
    } catch (e) {
      toastApiError(e, editTarget ? 'Không cập nhật được chú thích.' : 'Không tạo được chú thích.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canEdit,
    isSubmitting,
    form,
    editTarget,
    recordingId,
    expertId,
    onMutationSuccess,
    resetForm,
  ]);

  const handleDelete = useCallback(
    async (item: AnnotationDto) => {
      if (!canEdit || isSubmitting) return;
      if (item.expertId !== expertId) {
        uiToast.warning(notifyLine('Không đủ quyền', 'Bạn chỉ có thể xóa chú thích do chính mình tạo.'));
        return;
      }
      const accepted = window.confirm('Xóa chú thích này? Hành động này không thể hoàn tác.');
      if (!accepted) return;

      setIsSubmitting(true);
      try {
        const id = String(item.id ?? '').trim();
        if (!id) throw new Error('Missing annotation id');
        await annotationApi.delete(id);
        uiToast.success(notifyLine('Thành công', 'Đã xóa chú thích.'));
        await onMutationSuccess();
        if (editTarget?.id === item.id) resetForm();
      } catch (e) {
        toastApiError(e, 'Không xóa được chú thích.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [canEdit, isSubmitting, expertId, editTarget, onMutationSuccess, resetForm],
  );

  const patchForm = useCallback((patch: Partial<AnnotationFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
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
    setShowForm,
  };
}
