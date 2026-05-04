import {
  apiFetch,
  apiOk,
  asApiEnvelope,
  normalizePagedResponse,
  openApiQueryRecord,
  unwrapServiceResponse,
} from '@/api';
import type {
  ApiAssignReviewerRequest as AssignReviewerRequest,
  ApiCreateCopyrightDisputeRequest as CreateCopyrightDisputeRequest,
  ApiResolveDisputeRequest as ResolveDisputeRequest,
} from '@/api';
import type {
  CopyrightDisputeDto,
  CopyrightDisputeListFilters,
  CopyrightDisputePagedResult,
} from '@/types/copyrightDispute';
import { extractObject } from '@/utils/apiHelpers';

function asDisputePagedResult(data: unknown): CopyrightDisputePagedResult {
  const { items, total, page, pageSize } = normalizePagedResponse<CopyrightDisputeDto>(data);
  return {
    items,
    page,
    pageSize,
    total,
  };
}

function buildDisputeListParams(
  filters?: CopyrightDisputeListFilters,
): Record<string, string | number | undefined> {
  if (!filters) return {};
  return {
    status: filters.status,
    assignedReviewerId: filters.assignedReviewerId,
    recordingId: filters.recordingId,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export const copyrightDisputeApi = {
  async create(data: CreateCopyrightDisputeRequest): Promise<CopyrightDisputeDto | null> {
    const res = await apiOk(
      asApiEnvelope<unknown>(apiFetch.POST('/api/CopyrightDispute', { body: data })),
    );
    const unwrapped = unwrapServiceResponse<CopyrightDisputeDto>(res);
    if (unwrapped) return unwrapped;
    const obj = extractObject(res);
    return (obj as CopyrightDisputeDto | null) ?? null;
  },

  async list(filters?: CopyrightDisputeListFilters): Promise<CopyrightDisputePagedResult> {
    const res = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/CopyrightDispute', {
          params: { query: openApiQueryRecord(buildDisputeListParams(filters)) },
        }),
      ),
    );
    return asDisputePagedResult(res);
  },

  async getById(disputeId: string): Promise<CopyrightDisputeDto | null> {
    const res = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/CopyrightDispute/{disputeId}', {
          params: { path: { disputeId } },
        }),
      ),
    );
    const unwrapped = unwrapServiceResponse<CopyrightDisputeDto>(res);
    if (unwrapped) return unwrapped;
    const obj = extractObject(res);
    if (!obj) return null;
    return obj as unknown as CopyrightDisputeDto;
  },

  async assign(disputeId: string, reviewerId: string): Promise<void> {
    const body: AssignReviewerRequest = { reviewerId };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.POST('/api/CopyrightDispute/{disputeId}/assign', {
          params: { path: { disputeId } },
          body,
        }),
      ),
    );
  },

  async resolve(disputeId: string, data: ResolveDisputeRequest): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.POST('/api/CopyrightDispute/{disputeId}/resolve', {
          params: { path: { disputeId } },
          body: data,
        }),
      ),
    );
  },

  async uploadEvidence(disputeId: string, file: File): Promise<void> {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.POST('/api/CopyrightDispute/{disputeId}/evidence', {
          params: { path: { disputeId } },
          body: { file } as never,
        }),
      ),
    );
  },
};
