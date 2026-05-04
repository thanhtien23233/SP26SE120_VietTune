import {
  apiFetch,
  apiOk,
  normalizePagedResponse,
  unwrapServiceResponse,
} from '@/api';
import type {
  ApiEmbargoCreateUpdateDto as EmbargoCreateUpdateDto,
  ApiEmbargoLiftDto as EmbargoLiftDto,
} from '@/api';
import type {
  EmbargoDto,
  EmbargoListFilters,
  EmbargoPagedResult,
} from '@/types/embargo';
import { getHttpStatus } from '@/utils/httpError';

let embargoUnavailable = false;

export function resetEmbargoUnavailableForTests(): void {
  embargoUnavailable = false;
}

function markUnavailableIf404(err: unknown): void {
  const status = getHttpStatus(err);
  if (status === 404) embargoUnavailable = true;
}

function asEmbargoPagedResult(data: unknown): EmbargoPagedResult {
  const { items, total, page, pageSize } = normalizePagedResponse<EmbargoDto>(data);
  return {
    items,
    page,
    pageSize,
    total,
  };
}

function buildEmbargoListParams(filters?: EmbargoListFilters): Record<string, string | number | undefined> {
  if (!filters) return {};
  return {
    status: filters.status,
    page: filters.page,
    pageSize: filters.pageSize,
    from: filters.from,
    to: filters.to,
  };
}

export const embargoApi = {
  async getByRecordingId(recordingId: string): Promise<EmbargoDto | null> {
    if (embargoUnavailable) return null;
    try {
      const res = await apiOk(
        apiFetch.GET('/api/Embargo/recording/{recordingId}', {
          params: { path: { recordingId } },
        }),
      );
      const unwrapped = unwrapServiceResponse<EmbargoDto>(res as unknown);
      if (unwrapped) return unwrapped;
      return null;
    } catch (err: unknown) {
      markUnavailableIf404(err);
      const status = getHttpStatus(err);
      if (status === 404) return null;
      throw err;
    }
  },

  async createOrUpdate(recordingId: string, data: EmbargoCreateUpdateDto): Promise<EmbargoDto | null> {
    if (embargoUnavailable) return null;
    try {
      const res = await apiOk(
        apiFetch.PUT('/api/Embargo/recording/{recordingId}', {
          params: { path: { recordingId } },
          body: data,
        }),
      );
      const unwrapped = unwrapServiceResponse<EmbargoDto>(res as unknown);
      if (unwrapped) return unwrapped;
      return null;
    } catch (err: unknown) {
      markUnavailableIf404(err);
      throw err;
    }
  },

  async lift(recordingId: string, data: EmbargoLiftDto): Promise<void> {
    if (embargoUnavailable) return;
    try {
      await apiOk(
        apiFetch.POST('/api/Embargo/recording/{recordingId}/lift', {
          params: { path: { recordingId } },
          body: data,
        }),
      );
    } catch (err: unknown) {
      markUnavailableIf404(err);
      throw err;
    }
  },

  async list(filters?: EmbargoListFilters): Promise<EmbargoPagedResult> {
    if (embargoUnavailable) return asEmbargoPagedResult({ items: [], total: 0, page: 1, pageSize: 20 });
    try {
      const res = await apiOk(
        apiFetch.GET('/api/Embargo', {
          params: { query: buildEmbargoListParams(filters) },
        }),
      );
      return asEmbargoPagedResult(res as unknown);
    } catch (err: unknown) {
      markUnavailableIf404(err);
      const status = getHttpStatus(err);
      if (status === 404) return asEmbargoPagedResult({ items: [], total: 0, page: 1, pageSize: 20 });
      throw err;
    }
  },
};
