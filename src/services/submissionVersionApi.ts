import { apiFetch, apiOk, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiCreateSubmissionVersionDto as CreateSubmissionVersionDto,
  ApiUpdateSubmissionVersionDto as UpdateSubmissionVersionDto,
} from '@/api';
import type {
  SubmissionVersionDto,
  SubmissionVersionListFilters,
  SubmissionVersionPagedResult,
} from '@/types/submissionVersion';

function asSubmissionVersionPagedResult(data: unknown): SubmissionVersionPagedResult {
  const { items, total, page, pageSize } = normalizePagedResponse<SubmissionVersionDto>(data);
  return {
    items,
    page,
    pageSize,
    total,
  };
}

function buildListParams(
  filters?: SubmissionVersionListFilters,
): Record<string, number | string | undefined> {
  if (!filters) return {};
  return {
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export const submissionVersionApi = {
  async list(filters?: SubmissionVersionListFilters): Promise<SubmissionVersionPagedResult> {
    const res = await apiOk(
      apiFetch.GET('/api/SubmissionVersion', {
        params: { query: buildListParams(filters) },
      }),
    );
    return asSubmissionVersionPagedResult(res as unknown);
  },

  async listBySubmission(
    submissionId: string,
    filters?: SubmissionVersionListFilters,
  ): Promise<SubmissionVersionPagedResult> {
    void filters;
    const res = await apiOk(
      apiFetch.GET('/api/SubmissionVersion/submission/{submissionId}', {
        params: { path: { submissionId } },
      }),
    );
    // Endpoint này (theo swagger hiện tại) trả ServiceResponse<List<SubmissionVersionDto>>,
    // không có paging query. Chuẩn hoá về SubmissionVersionPagedResult để giữ ổn định UI.
    const list = unwrapServiceResponse<SubmissionVersionDto[]>(res as unknown) ?? [];
    return {
      items: list,
      page: 1,
      pageSize: list.length,
      total: list.length,
    };
  },

  async getLatest(submissionId: string): Promise<SubmissionVersionDto | null> {
    const res = await apiOk(
      apiFetch.GET('/api/SubmissionVersion/submission/{submissionId}/latest', {
        params: { path: { submissionId } },
      }),
    );
    const unwrapped = unwrapServiceResponse<SubmissionVersionDto>(res as unknown);
    if (unwrapped) return unwrapped;
    return null;
  },

  async getById(id: string): Promise<SubmissionVersionDto | null> {
    const res = await apiOk(
      apiFetch.GET('/api/SubmissionVersion/{id}', {
        params: { path: { id } },
      }),
    );
    const unwrapped = unwrapServiceResponse<SubmissionVersionDto>(res as unknown);
    if (unwrapped) return unwrapped;
    return null;
  },

  async create(data: CreateSubmissionVersionDto): Promise<SubmissionVersionDto | null> {
    const res = await apiOk(
      apiFetch.POST('/api/SubmissionVersion', {
        body: data,
      }),
    );
    const unwrapped = unwrapServiceResponse<SubmissionVersionDto>(res as unknown);
    if (unwrapped) return unwrapped;
    return null;
  },

  async update(id: string, data: UpdateSubmissionVersionDto): Promise<SubmissionVersionDto | null> {
    const res = await apiOk(
      apiFetch.PUT('/api/SubmissionVersion/{id}', {
        params: { path: { id } },
        body: data,
      }),
    );
    const unwrapped = unwrapServiceResponse<SubmissionVersionDto>(res as unknown);
    if (unwrapped) return unwrapped;
    return null;
  },

  async remove(id: string): Promise<void> {
    await apiOk(
      apiFetch.DELETE('/api/SubmissionVersion/{id}', {
        params: { path: { id } },
      }),
    );
  },

  async removeAllBySubmission(submissionId: string): Promise<void> {
    await apiOk(
      apiFetch.DELETE('/api/SubmissionVersion/submission/{submissionId}/all', {
        params: { path: { submissionId } },
      }),
    );
  },
};
