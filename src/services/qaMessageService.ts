import { apiFetch, apiOk, normalizePagedResponse, unwrapServiceResponse } from '@/api';
import type {
  ApiQAMessageByConversationQuery,
  ApiQAMessageDto,
  ApiQAMessageFlagQuery,
  ApiQAMessageListQuery,
} from '@/api';
import type { ServiceApiClient } from '@/services/serviceApiClient';
import { logServiceError } from '@/services/serviceLogger';

export interface QAMessageRequest {
  id: string;
  conversationId: string;
  role: number;
  content: string;
  sourceRecordingIdsJson?: string | null;
  sourceKBEntryIdsJson?: string | null;
  confidenceScore?: number;
  flaggedByExpert?: boolean;
  correctedByExpertId?: string | null;
  expertCorrection?: string | null;
  createdAt: string;
}

export type QAMessagePagedResult = {
  data: QAMessageRequest[];
  total: number;
  page: number;
  pageSize: number;
};

function mapApiQAMessageToLocal(dto: ApiQAMessageDto): QAMessageRequest {
  return {
    id: String(dto.id ?? ''),
    conversationId: String(dto.conversationId ?? ''),
    role: Number(dto.role ?? 0),
    content: String(dto.content ?? ''),
    sourceRecordingIdsJson: dto.sourceRecordingIdsJson ?? null,
    sourceKBEntryIdsJson: dto.sourceKBEntryIdsJson ?? null,
    confidenceScore: dto.confidenceScore ?? undefined,
    flaggedByExpert: Boolean(dto.flaggedByExpert ?? false),
    correctedByExpertId: dto.correctedByExpertId ?? null,
    expertCorrection: dto.expertCorrection ?? null,
    createdAt: String(dto.createdAt ?? new Date().toISOString()),
  };
}

function toPayload(data: QAMessageRequest): ApiQAMessageDto {
  return {
    id: data.id,
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    sourceRecordingIdsJson: data.sourceRecordingIdsJson ?? null,
    sourceKBEntryIdsJson: data.sourceKBEntryIdsJson ?? null,
    confidenceScore: data.confidenceScore ?? null,
    flaggedByExpert: data.flaggedByExpert ?? false,
    correctedByExpertId: data.correctedByExpertId ?? null,
    expertCorrection: data.expertCorrection ?? null,
    createdAt: data.createdAt,
  };
}

export function createQAMessageService(client: ServiceApiClient) {
  return {
    createQAMessage: async (data: QAMessageRequest): Promise<void> => {
      try {
        await client.post('/QAMessage', data);
      } catch (err) {
        logServiceError('Lỗi khi lưu tin nhắn', err);
        throw err;
      }
    },

    fetchConversationMessages: async (conversationId: string): Promise<QAMessageRequest[]> => {
      try {
        const res = await client.get<{ data?: QAMessageRequest[] } | QAMessageRequest[]>(
          '/QAMessage/get-by-conversation',
          {
            params: { conversationId },
          },
        );
        if (Array.isArray(res)) return res;
        return Array.isArray(res?.data) ? res.data : [];
      } catch (err) {
        logServiceError('Lỗi khi lấy tin nhắn hội thoại', err);
        return [];
      }
    },

    flagMessage: async (messageId: string): Promise<void> => {
      try {
        await client.put('/QAMessage/flagged', { id: messageId });
      } catch (err) {
        logServiceError('Lỗi khi flag tin nhắn', err);
        throw err;
      }
    },

    unflagMessage: async (messageId: string): Promise<void> => {
      try {
        await client.put('/QAMessage/unflagged', { id: messageId });
      } catch (err) {
        logServiceError('Lỗi khi unflag tin nhắn', err);
        throw err;
      }
    },
  };
}

export async function createQAMessage(data: QAMessageRequest): Promise<void> {
  try {
    await apiOk(apiFetch.POST('/api/QAMessage', { body: toPayload(data) }));
  } catch (err) {
    logServiceError('Lỗi khi lưu tin nhắn', err);
    throw err;
  }
}

export async function fetchConversationMessages(conversationId: string): Promise<QAMessageRequest[]> {
  try {
    const params: ApiQAMessageByConversationQuery = { conversationId };
    const res = await apiOk(
      apiFetch.GET('/api/QAMessage/get-by-conversation', { params: { query: params } }),
    );
    // Swagger hiện đang `content?: never` cho endpoint này, nên giữ mapping mềm.
    const arr = Array.isArray(res) ? (res as ApiQAMessageDto[]) : [];
    return arr.map(mapApiQAMessageToLocal);
  } catch (err) {
    logServiceError('Lỗi khi lấy tin nhắn hội thoại', err);
    return [];
  }
}

export async function fetchAllMessages(page = 1, pageSize = 10): Promise<QAMessagePagedResult> {
  try {
    const params: ApiQAMessageListQuery = { page, pageSize };
    const res = await apiOk(apiFetch.GET('/api/QAMessage', { params: { query: params } }));
    const normalized = normalizePagedResponse<ApiQAMessageDto>(res as unknown);
    return {
      data: normalized.items.map(mapApiQAMessageToLocal),
      total: normalized.total,
      page: normalized.page,
      pageSize: normalized.pageSize,
    };
  } catch (err) {
    logServiceError('Lỗi khi lấy danh sách tin nhắn QA', err);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
    };
  }
}

export async function getMessageById(id: string): Promise<QAMessageRequest | null> {
  try {
    const res = await apiOk(apiFetch.GET('/api/QAMessage/{id}', { params: { path: { id } } }));
    const dto = unwrapServiceResponse<ApiQAMessageDto>(res as unknown);
    return dto ? mapApiQAMessageToLocal(dto) : null;
  } catch (err) {
    logServiceError('Lỗi khi lấy chi tiết tin nhắn QA', err);
    return null;
  }
}

export async function updateMessage(id: string, data: QAMessageRequest): Promise<void> {
  try {
    await apiOk(
      apiFetch.PUT('/api/QAMessage/{id}', { params: { path: { id } }, body: toPayload(data) }),
    );
  } catch (err) {
    logServiceError('Lỗi khi cập nhật tin nhắn QA', err);
    throw err;
  }
}

export async function flagMessage(messageId: string): Promise<void> {
  try {
    const params: ApiQAMessageFlagQuery = { id: messageId };
    await apiOk(apiFetch.PUT('/api/QAMessage/flagged', { params: { query: params } }));
  } catch (err) {
    logServiceError('Lỗi khi flag tin nhắn', err);
    throw err;
  }
}

export async function unflagMessage(messageId: string): Promise<void> {
  try {
    const params: ApiQAMessageFlagQuery = { id: messageId };
    await apiOk(apiFetch.PUT('/api/QAMessage/unflagged', { params: { query: params } }));
  } catch (err) {
    logServiceError('Lỗi khi unflag tin nhắn', err);
    throw err;
  }
}
