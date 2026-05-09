import { apiFetch, apiOk, asApiEnvelope, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiVocalStyleDto,
  ApiVocalStyleListQuery,
  ApiPagedResponseVocalStyleDto,
  ApiServiceResponseVocalStyleDto,
} from '@/api';

export const vocalStyleService = {
  getVocalStyles: async (page: number = 1, pageSize: number = 50) => {
    const query: ApiVocalStyleListQuery = { page, pageSize };
    const res = await apiOk<ApiPagedResponseVocalStyleDto>(
      asApiEnvelope<ApiPagedResponseVocalStyleDto>(
        apiFetch.GET('/api/VocalStyle', { params: { query } }),
      ),
    );
    return normalizePagedResponse<ApiVocalStyleDto>(res);
  },

  getVocalStyleById: async (id: string) => {
    const res = await apiOk<ApiServiceResponseVocalStyleDto>(
      asApiEnvelope<ApiServiceResponseVocalStyleDto>(
        apiFetch.GET('/api/VocalStyle/{id}', { params: { path: { id } } }),
      ),
    );
    return unwrapServiceResponse<ApiVocalStyleDto>(res);
  },

  searchVocalStyles: async (query: string) => {
    const res = await apiOk<ApiPagedResponseVocalStyleDto>(
      asApiEnvelope<ApiPagedResponseVocalStyleDto>(
        apiFetch.GET('/api/ReferenceData/vocal-styles/search', { params: { query: { keyword: query } } }),
      ),
    );
    return normalizePagedResponse<ApiVocalStyleDto>(res).items;
  },

  createVocalStyle: async (data: Partial<ApiVocalStyleDto>) => {
    const res = await apiOk<ApiServiceResponseVocalStyleDto>(
      asApiEnvelope<ApiServiceResponseVocalStyleDto>(
        apiFetch.POST('/api/VocalStyle', {
          body: data as ApiVocalStyleDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiVocalStyleDto>(res);
  },

  updateVocalStyle: async (id: string, data: Partial<ApiVocalStyleDto>) => {
    const res = await apiOk<ApiServiceResponseVocalStyleDto>(
      asApiEnvelope<ApiServiceResponseVocalStyleDto>(
        apiFetch.PUT('/api/VocalStyle/{id}', {
          params: { path: { id } },
          body: data as ApiVocalStyleDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiVocalStyleDto>(res);
  },

  deleteVocalStyle: async (id: string) => {
    const res = await apiOk<{ data?: boolean | null } | unknown>(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/VocalStyle/{id}', { params: { path: { id } } }),
      ),
    );
    return res;
  },
};
