import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type {
  ApiCreateAnnotationDto as CreateAnnotationDto,
  ApiUpdateAnnotationDto as UpdateAnnotationDto,
} from '@/api';
import type { AnnotationDto, AnnotationDtoPagedList } from '@/types/annotation';
import { extractArray, extractObject } from '@/utils/apiHelpers';
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

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asPagedList(data: unknown): AnnotationDtoPagedList {
  const rows = extractArray<AnnotationDto>(data, ['items', 'Items', 'data', 'Data']);
  const obj = extractObject(data);
  return {
    items: rows,
    page: readNumber(obj?.page ?? obj?.Page, 1),
    pageSize: readNumber(obj?.pageSize ?? obj?.PageSize, rows.length || 20),
    total: readNumber(obj?.total ?? obj?.Total, rows.length),
  };
}

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

  /** Swagger: GET /api/Song/{songId}/annotations — không có query phân trang. */
  async getBySongId(songId: string): Promise<AnnotationDtoPagedList> {
    const res = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/Song/{songId}/annotations', {
          params: { path: { songId } },
        }),
      ),
    );
    return asPagedList(res as AnnotationCollectionResponse);
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
