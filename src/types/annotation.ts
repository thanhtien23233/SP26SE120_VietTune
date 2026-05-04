/** Annotation types aligned with VietTuneArchive Swagger (Annotation tag). */

import type {
  ApiAnnotationDto,
  ApiCreateAnnotationDto,
  ApiUpdateAnnotationDto,
} from '@/api';

export const ANNOTATION_TYPES = [
  'scholarly_note',
  'rare_variant',
  'research_link',
  'general',
] as const;

export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

export type AnnotationDto = ApiAnnotationDto;

export type CreateAnnotationDto = ApiCreateAnnotationDto;

export type UpdateAnnotationDto = ApiUpdateAnnotationDto;

export interface AnnotationDtoPagedList {
  items: AnnotationDto[] | null;
  page: number;
  pageSize: number;
  total: number;
}

export const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  scholarly_note: 'Ghi chú học thuật',
  rare_variant: 'Dị bản hiếm gặp',
  research_link: 'Tài liệu nghiên cứu',
  general: 'Ghi chú chung',
};
