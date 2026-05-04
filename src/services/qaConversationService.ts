import { apiFetch, apiOk, normalizePagedResponse } from '@/api';
import type { ApiQAConversationByUserQuery, ApiQAConversationDto } from '@/api';
import type { ServiceApiClient } from '@/services/serviceApiClient';
import { logServiceError } from '@/services/serviceLogger';

export interface QAConversationRequest {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}

function mapApiConversationToLocal(dto: ApiQAConversationDto): QAConversationRequest {
  return {
    id: String(dto.id ?? ''),
    userId: String(dto.userId ?? ''),
    title: String(dto.title ?? ''),
    createdAt: String(dto.createdAt ?? new Date().toISOString()),
  };
}

export function createQAConversationService(client: ServiceApiClient) {
  return {
    createQAConversation: async (data: QAConversationRequest): Promise<void> => {
      try {
        const payload: ApiQAConversationDto = {
          id: data.id,
          userId: data.userId,
          title: data.title,
          createdAt: data.createdAt,
        };
        await client.post('/QAConversation', payload);
      } catch (err) {
        logServiceError('Lỗi khi tạo conversation', err);
        throw err;
      }
    },
    fetchUserConversations: async (userId: string): Promise<QAConversationRequest[]> => {
      try {
        const params: ApiQAConversationByUserQuery = { userId };
        const res = await client.get<{ data?: ApiQAConversationDto[] } | ApiQAConversationDto[]>(
          '/QAConversation/get-by-user',
          {
            params,
          },
        );
        if (Array.isArray(res)) return res.map(mapApiConversationToLocal);
        return Array.isArray(res?.data) ? res.data.map(mapApiConversationToLocal) : [];
      } catch (err) {
        logServiceError('Lỗi khi lấy lịch sử hội thoại', err);
        return [];
      }
    },
  };
}

export async function createQAConversation(data: QAConversationRequest): Promise<void> {
  const payload: ApiQAConversationDto = {
    id: data.id,
    userId: data.userId,
    title: data.title,
    createdAt: data.createdAt,
  };
  await apiOk(apiFetch.POST('/api/QAConversation', { body: payload }));
}

export async function fetchUserConversations(userId: string): Promise<QAConversationRequest[]> {
  try {
    const params: ApiQAConversationByUserQuery = { userId };
    const res = await apiOk(
      apiFetch.GET('/api/QAConversation/get-by-user', { params: { query: params } }),
    );
    const arr = Array.isArray(res) ? (res as ApiQAConversationDto[]) : [];
    return arr.map(mapApiConversationToLocal);
  } catch (err) {
    logServiceError('Lỗi khi lấy lịch sử hội thoại', err);
    return [];
  }
}

export async function fetchQAConversationsPaged(page = 1, pageSize = 20): Promise<QAConversationRequest[]> {
  const res = await apiOk(
    apiFetch.GET('/api/QAConversation', { params: { query: { page, pageSize } } }),
  );
  const normalized = normalizePagedResponse<ApiQAConversationDto>(res as unknown);
  return normalized.items.map(mapApiConversationToLocal);
}
