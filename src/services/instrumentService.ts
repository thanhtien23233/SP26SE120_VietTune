import { apiFetch, apiOk, asApiEnvelope, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiInstrumentDto,
  ApiInstrumentListQuery,
  ApiPagedResponseInstrumentDto,
  ApiServiceResponseInstrumentDto,
} from '@/api';

export const instrumentService = {
  getInstruments: async (page: number = 1, pageSize: number = 50) => {
    const query: ApiInstrumentListQuery = { page, pageSize };
    const res = await apiOk<ApiPagedResponseInstrumentDto>(
      asApiEnvelope<ApiPagedResponseInstrumentDto>(
        apiFetch.GET('/api/Instrument', { params: { query } }),
      ),
    );
    return normalizePagedResponse<ApiInstrumentDto>(res);
  },

  getInstrumentById: async (id: string) => {
    const res = await apiOk<ApiServiceResponseInstrumentDto>(
      asApiEnvelope<ApiServiceResponseInstrumentDto>(
        apiFetch.GET('/api/Instrument/{id}', { params: { path: { id } } }),
      ),
    );
    return unwrapServiceResponse<ApiInstrumentDto>(res);
  },

  searchInstruments: async (query: string) => {
    const res = await apiOk<ApiPagedResponseInstrumentDto>(
      asApiEnvelope<ApiPagedResponseInstrumentDto>(
        apiFetch.GET('/api/Instrument/search', { params: { query: { keyword: query } } }),
      ),
    );
    return normalizePagedResponse<ApiInstrumentDto>(res).items;
  },

  createInstrument: async (data: Partial<ApiInstrumentDto>) => {
    const res = await apiOk<ApiServiceResponseInstrumentDto>(
      asApiEnvelope<ApiServiceResponseInstrumentDto>(
        apiFetch.POST('/api/Instrument', {
          body: data as ApiInstrumentDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiInstrumentDto>(res);
  },

  updateInstrument: async (id: string, data: Partial<ApiInstrumentDto>) => {
    const res = await apiOk<ApiServiceResponseInstrumentDto>(
      asApiEnvelope<ApiServiceResponseInstrumentDto>(
        apiFetch.PUT('/api/Instrument/{id}', {
          params: { path: { id } },
          body: data as ApiInstrumentDto,
        }),
      ),
    );
    return unwrapServiceResponse<ApiInstrumentDto>(res);
  },

  deleteInstrument: async (id: string) => {
    const res = await apiOk<{ data?: boolean | null } | unknown>(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/Instrument/{id}', { params: { path: { id } } }),
      ),
    );
    return res;
  },
};
