/**
 * Chat Session Storage — lightweight local persistence for the current chat session.
 *
 * Scope: Only the **active session** (current conversation messages) + conversation
 * list metadata are stored in localStorage. Full conversation history lives in the
 * backend database and is fetched via QA APIs.
 *
 * This enables:
 * - Instant message display on page revisit (no loading spinner for current chat)
 * - Conversation list metadata cache for faster sidebar rendering
 * - Resilience against brief network interruptions
 */

import type { Message } from '@/types/chat';
import type { QAConversationRequest } from '@/services/qaConversationService';

const STORAGE_KEYS = {
  SESSION_MESSAGES: 'viettune_chat_session_messages',
  SESSION_CONVERSATION_ID: 'viettune_chat_session_conv_id',
  SESSION_TITLE: 'viettune_chat_session_title',
  CONVERSATION_LIST: 'viettune_chat_conv_list',
} as const;

// ── Session messages (current conversation only) ──────────────────────────

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceRecordingIdsJson?: string | null;
  sourceKBEntryIdsJson?: string | null;
  expertCorrection?: string | null;
  flaggedByExpert?: boolean;
}

function serializeMessages(messages: Message[]): string {
  const stored: StoredMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: m.timestamp.toISOString(),
    sourceRecordingIdsJson: m.sourceRecordingIdsJson,
    sourceKBEntryIdsJson: m.sourceKBEntryIdsJson,
    expertCorrection: m.expertCorrection,
    flaggedByExpert: m.flaggedByExpert,
  }));
  return JSON.stringify(stored);
}

function deserializeMessages(json: string): Message[] {
  try {
    const stored = JSON.parse(json) as StoredMessage[];
    if (!Array.isArray(stored)) return [];
    return stored.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
      sourceRecordingIdsJson: m.sourceRecordingIdsJson,
      sourceKBEntryIdsJson: m.sourceKBEntryIdsJson,
      expertCorrection: m.expertCorrection,
      flaggedByExpert: m.flaggedByExpert,
    }));
  } catch {
    return [];
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export const chatSessionStorage = {
  /** Save current session messages to localStorage. */
  saveSessionMessages(conversationId: string, title: string, messages: Message[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_CONVERSATION_ID, conversationId);
      localStorage.setItem(STORAGE_KEYS.SESSION_TITLE, title);
      localStorage.setItem(STORAGE_KEYS.SESSION_MESSAGES, serializeMessages(messages));
    } catch {
      // localStorage full or unavailable — non-critical, silently skip
    }
  },

  /** Load current session from localStorage. Returns null if no session exists. */
  loadSession(): { conversationId: string; title: string; messages: Message[] } | null {
    try {
      const convId = localStorage.getItem(STORAGE_KEYS.SESSION_CONVERSATION_ID);
      const title = localStorage.getItem(STORAGE_KEYS.SESSION_TITLE);
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION_MESSAGES);
      if (!convId || !raw) return null;
      const messages = deserializeMessages(raw);
      if (messages.length === 0) return null;
      return { conversationId: convId, title: title || 'Cuộc trò chuyện', messages };
    } catch {
      return null;
    }
  },

  /** Clear current session (e.g. when starting a new chat). */
  clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION_CONVERSATION_ID);
      localStorage.removeItem(STORAGE_KEYS.SESSION_TITLE);
      localStorage.removeItem(STORAGE_KEYS.SESSION_MESSAGES);
    } catch {
      // non-critical
    }
  },

  // ── Conversation list metadata cache ────────────────────────────────────

  /** Cache conversation list metadata for fast sidebar render. */
  saveConversationList(conversations: QAConversationRequest[]): void {
    try {
      // Keep only lightweight metadata (id, title, date) — cap at 50
      const slim = conversations.slice(0, 50).map((c) => ({
        id: c.id,
        userId: c.userId,
        title: c.title,
        createdAt: c.createdAt,
      }));
      localStorage.setItem(STORAGE_KEYS.CONVERSATION_LIST, JSON.stringify(slim));
    } catch {
      // non-critical
    }
  },

  /** Load cached conversation list metadata. */
  loadConversationList(): QAConversationRequest[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATION_LIST);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as QAConversationRequest[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /** Clear conversation list cache. */
  clearConversationList(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CONVERSATION_LIST);
    } catch {
      // non-critical
    }
  },
};
