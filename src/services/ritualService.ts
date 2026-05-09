import { apiFetch, apiOk, asApiEnvelope, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiCeremonyDto,
  ApiCeremonyListQuery,
  ApiPagedResponseCeremonyDto,
  ApiServiceResponseCeremonyDto,
} from '@/api';

export const ritualService = {
  getCeremonies: async (page: number = 1, pageSize: number = 50) => {
    const query: ApiCeremonyListQuery = { page, pageSize };
    const res = await apiOk<ApiPagedResponseCeremonyDto>(
      asApiEnvelope<ApiPagedResponseCeremonyDto>(
        apiFetch.GET('/api/Ceremony', { params: { query } }),
      ),
    );
    return normalizePagedResponse<ApiCeremonyDto>(res);
  },

  getCeremonyById: async (id: string) => {
    const res = await apiOk<ApiServiceResponseCeremonyDto>(
      asApiEnvelope<ApiServiceResponseCeremonyDto>(
        apiFetch.GET('/api/Ceremony/{id}', { params: { path: { id } } }),
      ),
    );
    return unwrapServiceResponse<ApiCeremonyDto>(res);
  },

  searchCeremonies: async (query: string) => {
    const res = await apiOk<ApiPagedResponseCeremonyDto>(
      asApiEnvelope<ApiPagedResponseCeremonyDto>(
        apiFetch.GET('/api/ReferenceData/ceremonies/search', { params: { query: { keyword: query } } }),
      ),
    );
    return normalizePagedResponse<ApiCeremonyDto>(res).items;
  },

  createCeremony: async (data: Partial<ApiCeremonyDto>) => {
    const res = await apiOk<ApiServiceResponseCeremonyDto>(
      asApiEnvelope<ApiServiceResponseCeremonyDto>(
        apiFetch.POST('/api/Ceremony', {
          body: data as ApiCeremonyDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiCeremonyDto>(res);
  },

  updateCeremony: async (id: string, data: Partial<ApiCeremonyDto>) => {
    const res = await apiOk<ApiServiceResponseCeremonyDto>(
      asApiEnvelope<ApiServiceResponseCeremonyDto>(
        apiFetch.PUT('/api/Ceremony/{id}', {
          params: { path: { id } },
          body: data as ApiCeremonyDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiCeremonyDto>(res);
  },

  deleteCeremony: async (id: string) => {
    const res = await apiOk<{ data?: boolean | null } | unknown>(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/Ceremony/{id}', { params: { path: { id } } }),
      ),
    );
    return res;
  },
};
