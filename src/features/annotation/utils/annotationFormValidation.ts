import {
  ANNOTATION_MAX_CITATION_LENGTH,
  ANNOTATION_MAX_CONTENT_LENGTH,
} from '@/config/validationConstants';
import type {
  AnnotationDto,
  AnnotationType,
  CreateAnnotationDto,
} from '@/types/annotation';
import { ANNOTATION_TYPES } from '@/types/annotation';
import { parseOptionalInt } from '@/utils/annotationHelpers';

export { ANNOTATION_MAX_CITATION_LENGTH, ANNOTATION_MAX_CONTENT_LENGTH };

export type AnnotationFormState = {
  type: AnnotationType;
  content: string;
  researchCitation: string;
  timestampStart: string;
  timestampEnd: string;
};

export type AnnotationFormErrors = {
  content?: string;
  researchCitation?: string;
  timestampStart?: string;
  timestampEnd?: string;
};

export const DEFAULT_ANNOTATION_FORM: AnnotationFormState = {
  type: 'scholarly_note',
  content: '',
  researchCitation: '',
  timestampStart: '',
  timestampEnd: '',
};

export function toAnnotationFormState(item: AnnotationDto): AnnotationFormState {
  const type = (ANNOTATION_TYPES.includes((item.type ?? '') as AnnotationType)
    ? item.type
    : 'general') as AnnotationType;
  return {
    type,
    content: item.content ?? '',
    researchCitation: item.researchCitation ?? '',
    timestampStart: item.timestampStart == null ? '' : String(item.timestampStart),
    timestampEnd: item.timestampEnd == null ? '' : String(item.timestampEnd),
  };
}

export function validateAnnotationForm(form: AnnotationFormState):
  | {
      ok: true;
      payload: Omit<CreateAnnotationDto, 'recordingId' | 'expertId'>;
    }
  | { ok: false; errors: AnnotationFormErrors } {
  const errors: AnnotationFormErrors = {};
  const content = form.content.trim();
  const researchCitation = form.researchCitation.trim();
  const timestampStart = parseOptionalInt(form.timestampStart);
  const timestampEnd = parseOptionalInt(form.timestampEnd);

  if (!content) errors.content = 'Nội dung là bắt buộc.';
  else if (content.length > ANNOTATION_MAX_CONTENT_LENGTH)
    errors.content = `Nội dung tối đa ${ANNOTATION_MAX_CONTENT_LENGTH} ký tự.`;

  if (researchCitation.length > ANNOTATION_MAX_CITATION_LENGTH) {
    errors.researchCitation = `Trích dẫn tối đa ${ANNOTATION_MAX_CITATION_LENGTH} ký tự.`;
  } else if (researchCitation && /^https?:\/\//i.test(researchCitation.trim())) {
    try {
      void new URL(researchCitation.trim());
    } catch {
      errors.researchCitation = 'URL trích dẫn không hợp lệ.';
    }
  }

  if (Number.isNaN(timestampStart)) {
    errors.timestampStart = 'Mốc bắt đầu phải là số nguyên ≥ 0 (giây).';
  }
  if (Number.isNaN(timestampEnd)) {
    errors.timestampEnd = 'Mốc kết thúc phải là số nguyên ≥ 0 (giây).';
  }
  if (!Number.isNaN(timestampStart) && !Number.isNaN(timestampEnd)) {
    if (timestampStart != null && timestampEnd != null && timestampEnd < timestampStart) {
      errors.timestampEnd = 'Mốc kết thúc phải lớn hơn hoặc bằng mốc bắt đầu.';
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    payload: {
      type: form.type,
      content,
      researchCitation: researchCitation || null,
      timestampStart,
      timestampEnd,
    },
  };
}
