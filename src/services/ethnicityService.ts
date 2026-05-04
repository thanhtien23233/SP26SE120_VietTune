import { apiFetch, apiOk, asApiEnvelope, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiEthnicGroupDto,
  ApiPagedResponseEthnicGroupDto,
  ApiServiceResponseEthnicGroupDto,
} from '@/api';

export const ethnicityService = {
  getEthnicities: async (page: number = 1, pageSize: number = 100) => {
    const res = await apiOk<ApiPagedResponseEthnicGroupDto>(
      asApiEnvelope<ApiPagedResponseEthnicGroupDto>(
        apiFetch.GET('/api/EthnicGroup', { params: { query: { page, pageSize } } }),
      ),
    );
    return normalizePagedResponse<ApiEthnicGroupDto>(res);
  },

  getEthnicityById: async (id: string) => {
    const res = await apiOk<ApiServiceResponseEthnicGroupDto>(
      asApiEnvelope<ApiServiceResponseEthnicGroupDto>(
        apiFetch.GET('/api/EthnicGroup/{id}', { params: { path: { id } } }),
      ),
    );
    return unwrapServiceResponse<ApiEthnicGroupDto>(res);
  },

  createEthnicity: async (data: Partial<ApiEthnicGroupDto>) => {
    const res = await apiOk<ApiServiceResponseEthnicGroupDto>(
      asApiEnvelope<ApiServiceResponseEthnicGroupDto>(
        apiFetch.POST('/api/EthnicGroup', { body: data as ApiEthnicGroupDto }),
      ),
    );
    return unwrapServiceResponse<ApiEthnicGroupDto>(res);
  },

  updateEthnicity: async (id: string, data: Partial<ApiEthnicGroupDto>) => {
    const res = await apiOk<ApiServiceResponseEthnicGroupDto>(
      asApiEnvelope<ApiServiceResponseEthnicGroupDto>(
        apiFetch.PUT('/api/EthnicGroup/{id}', {
          params: { path: { id } },
          body: data as ApiEthnicGroupDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiEthnicGroupDto>(res);
  },

  deleteEthnicity: async (id: string) => {
    const res = await apiOk<{ data?: boolean | null } | unknown>(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/EthnicGroup/{id}', { params: { path: { id } } }),
      ),
    );
    return res;
  },
};
