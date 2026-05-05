import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type {
  ApiCreateAnnotationDto as CreateAnnotationDto,
  ApiUpdateAnnotationDto as UpdateAnnotationDto,
} from '@/api';
import type { AnnotationDto, AnnotationDtoPagedList } from '@/types/annotation';
import { extractArray } from '@/utils/apiHelpers';
import { getHttpStatus } from '@/utils/httpError';

type AnnotationCollectionResponse =
  | AnnotationDto[]
  | {
      data?: AnnotationDto[];
      Data?: AnnotationDto[];
      items?: AnnotationDto[];
      Items?: AnnotationDto[];
      results?: AnnotationDto[];
      Results?: AnnotationDto[];
    };



function normalizeRows(data: unknown): AnnotationDto[] {
  if (Array.isArray(data)) return data as AnnotationDto[];
  return extractArray<AnnotationDto>(data, ['items', 'Items', 'data', 'Data', 'results', 'Results']);
}

export const annotationApi = {
  async getByRecordingId(recordingId: string): Promise<AnnotationDto[]> {
    try {
      const res = await apiOk(
        asApiEnvelope<unknown>(
          apiFetch.GET('/api/Annotation/get-by-recording-id', {
            params: { query: { recordingId } },
          }),
        ),
      );
      return normalizeRows(res as AnnotationCollectionResponse);
    } catch (err: unknown) {
      const status = getHttpStatus(err);
      if (status === 400 || status === 404) return [];
      throw err;
    }
  },

  async getByExpertId(expertId: string): Promise<AnnotationDto[]> {
    const res = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/Annotation/get-by-expert-id', {
          params: { query: { expertId } },
        }),
      ),
    );
    return normalizeRows(res as AnnotationCollectionResponse);
  },

  /** Alias to getByRecordingId but returning paged format. */
  async getBySongId(songId: string): Promise<AnnotationDtoPagedList> {
    const rows = await this.getByRecordingId(songId);
    return {
      items: rows,
      page: 1,
      pageSize: Math.max(20, rows.length),
      total: rows.length,
    };
  },

  async create(data: CreateAnnotationDto): Promise<void> {
    await apiOk(apiFetch.POST('/api/Annotation/create', { body: data }));
  },

  async update(data: UpdateAnnotationDto): Promise<void> {
    await apiOk(apiFetch.PUT('/api/Annotation/update', { body: data }));
  },

  async delete(id: string): Promise<void> {
    await apiOk(apiFetch.DELETE('/api/Annotation/delete', { params: { query: { id } } }));
  },
};
