import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope } from '@/api';
import type { QAConversationRequest } from '@/services/qaConversationService';
import type { QAMessageRequest } from '@/services/qaMessageService';
import { logServiceError } from '@/services/serviceLogger';
import type { Message } from '@/types/chat';

/** Mirrors backend `SourceReference` (camelCase JSON from ASP.NET). */
export interface RagSourceReference {
  type: string;
  id: string;
  title: string;
}

export interface RagChatMessageResponse {
  id: string;
  role: number;
  content: string;
  sources?: RagSourceReference[];
  confidenceScore?: number | null;
  createdAt: string;
}

export interface RagConversationSummary {
  id: string;
  title?: string | null;
  createdAt: string;
}

export interface RagConversationDetail extends RagConversationSummary {
  messages: RagChatMessageResponse[];
}

function normalizeSource(raw: Record<string, unknown>): RagSourceReference {
  return {
    type: String(raw.type ?? raw.Type ?? ''),
    id: String(raw.id ?? raw.Id ?? ''),
    title: String(raw.title ?? raw.Title ?? ''),
  };
}

function normalizeMessage(raw: unknown): RagChatMessageResponse {
  const r = raw as Record<string, unknown>;
  const sourcesRaw = r.sources ?? r.Sources;
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.map((s) => normalizeSource(s as Record<string, unknown>))
    : undefined;
  return {
    id: String(r.id ?? r.Id ?? ''),
    role: Number(r.role ?? r.Role ?? 0),
    content: String(r.content ?? r.Content ?? ''),
    sources,
    confidenceScore: (r.confidenceScore ?? r.ConfidenceScore) as number | null | undefined,
    createdAt: String(r.createdAt ?? r.CreatedAt ?? new Date().toISOString()),
  };
}

function normalizeConversation(raw: unknown): RagConversationSummary {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? r.Id ?? ''),
    title: (r.title ?? r.Title) as string | null | undefined,
    createdAt: String(r.createdAt ?? r.CreatedAt ?? new Date().toISOString()),
  };
}

function normalizeConversationDetail(raw: unknown): RagConversationDetail {
  const r = raw as Record<string, unknown>;
  const messagesRaw = r.messages ?? r.Messages;

  return {
    ...normalizeConversation(raw),
    messages: Array.isArray(messagesRaw) ? messagesRaw.map(normalizeMessage) : [],
  };
}

/** Map RAG conversation row to the shape used by chat sidebars (same DB as QA). */
export function ragSummaryToQAConversation(s: RagConversationSummary, userId: string): QAConversationRequest {
  return {
    id: s.id,
    userId,
    title: s.title ?? '',
    createdAt: s.createdAt,
  };
}

export function sourcesToJsonFields(sources: RagSourceReference[] | undefined): {
  sourceRecordingIdsJson: string;
  sourceKBEntryIdsJson: string;
} {
  const rec: string[] = [];
  const kb: string[] = [];
  for (const s of sources ?? []) {
    const t = (s.type || '').toLowerCase();
    if (t === 'recording') rec.push(String(s.id));
    else if (t === 'kbentry') kb.push(String(s.id));
  }
  return {
    sourceRecordingIdsJson: JSON.stringify(rec),
    sourceKBEntryIdsJson: JSON.stringify(kb),
  };
}

function qaMessageToChatMessage(message: QAMessageRequest): Message {
  return {
    id: message.id,
    role: message.role === 0 ? 'user' : 'assistant',
    content: message.content,
    timestamp: new Date(message.createdAt),
    sourceRecordingIdsJson: message.sourceRecordingIdsJson,
    sourceKBEntryIdsJson: message.sourceKBEntryIdsJson,
    expertCorrection: message.expertCorrection,
    flaggedByExpert: message.flaggedByExpert,
  };
}

function ragMessageToChatMessage(message: RagChatMessageResponse): Message {
  const { sourceRecordingIdsJson, sourceKBEntryIdsJson } = sourcesToJsonFields(message.sources);

  return {
    id: message.id,
    role: message.role === 0 ? 'user' : 'assistant',
    content: message.content,
    timestamp: new Date(message.createdAt),
    sourceRecordingIdsJson,
    sourceKBEntryIdsJson,
  };
}

export function mergeRagAndQaToChatMessages(
  ragMessages: RagChatMessageResponse[],
  qaMessages: QAMessageRequest[],
): Message[] {
  const qaById = new Map(qaMessages.map((message) => [message.id, message]));

  if (ragMessages.length === 0) {
    return [...qaMessages]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(qaMessageToChatMessage);
  }

  const seenIds = new Set<string>();
  const merged = ragMessages.map((ragMessage) => {
    seenIds.add(ragMessage.id);
    const qaMessage = qaById.get(ragMessage.id);
    return qaMessage ? qaMessageToChatMessage(qaMessage) : ragMessageToChatMessage(ragMessage);
  });

  const qaOnlyMessages = qaMessages
    .filter((message) => !seenIds.has(message.id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(qaMessageToChatMessage);

  return [...merged, ...qaOnlyMessages];
}

/**
 * Create an authenticated RAG chat conversation.
 * OpenAPI: POST /api/rag-chat/conversations
 */
export async function createRagConversation(body: { title?: string | null }): Promise<RagConversationSummary> {
  const data = await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.POST('/api/rag-chat/conversations', { body: body as unknown }),
    ),
  );
  return normalizeConversation(data);
}

export async function listRagConversations(): Promise<RagConversationSummary[]> {
  try {
    const data = await apiOk(
      asApiEnvelope<unknown[]>(apiFetchLoose.GET('/api/rag-chat/conversations', {})),
    );
    if (!Array.isArray(data)) return [];
    return data.map(normalizeConversation);
  } catch (err) {
    logServiceError('Lỗi khi lấy danh sách hội thoại RAG', err);
    return [];
  }
}

export async function getRagConversation(conversationId: string): Promise<RagConversationDetail> {
  const data = await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.GET(`/api/rag-chat/conversations/${encodeURIComponent(conversationId)}`, {}),
    ),
  );
  return normalizeConversationDetail(data);
}

/**
 * Send a user message to an existing authenticated RAG chat conversation.
 * OpenAPI: POST /api/rag-chat/conversations/{id}/messages
 * Body: { content: string }
 */
export async function sendRagMessage(
  conversationId: string,
  body: { content: string },
): Promise<RagChatMessageResponse> {
  const data = await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.POST(`/api/rag-chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
        body: body as unknown,
      }),
    ),
  );
  return normalizeMessage(data);
}

export async function deleteRagConversation(conversationId: string): Promise<void> {
  await apiOk(
    asApiEnvelope<unknown>(
      apiFetchLoose.DELETE(`/api/rag-chat/conversations/${encodeURIComponent(conversationId)}`, {}),
    ),
  );
}

/** Admin: trigger embedding backfill for published recordings/KB entries. */
export async function postRagChatEmbeddingsBackfill(): Promise<unknown> {
  return apiOk(asApiEnvelope<unknown>(apiFetch.POST('/api/rag-chat/embeddings/backfill', {})));
}
