import { describe, expect, it } from 'vitest';

import type { QAMessageRequest } from '@/services/qaMessageService';
import {
  mergeRagAndQaToChatMessages,
  type RagChatMessageResponse,
} from '@/services/ragChatService';

const conversationId = 'conversation-1';

function qaMessage(overrides: Partial<QAMessageRequest>): QAMessageRequest {
  return {
    id: 'qa-message',
    conversationId,
    role: 0,
    content: 'QA content',
    sourceRecordingIdsJson: null,
    sourceKBEntryIdsJson: null,
    confidenceScore: undefined,
    flaggedByExpert: false,
    correctedByExpertId: null,
    expertCorrection: null,
    createdAt: '2026-05-09T06:00:00.000Z',
    ...overrides,
  };
}

function ragMessage(overrides: Partial<RagChatMessageResponse>): RagChatMessageResponse {
  return {
    id: 'rag-message',
    role: 1,
    content: 'RAG content',
    sources: [],
    confidenceScore: null,
    createdAt: '2026-05-09T06:00:00.000Z',
    ...overrides,
  };
}

describe('mergeRagAndQaToChatMessages', () => {
  it('keeps RAG order while enriching matching messages from QA', () => {
    const merged = mergeRagAndQaToChatMessages(
      [
        ragMessage({ id: 'assistant-1', role: 1, content: 'Assistant from RAG' }),
        ragMessage({ id: 'user-1', role: 0, content: 'User from RAG' }),
      ],
      [
        qaMessage({
          id: 'user-1',
          role: 0,
          content: 'User from QA',
          createdAt: '2026-05-09T06:01:00.000Z',
        }),
        qaMessage({
          id: 'assistant-1',
          role: 1,
          content: 'Assistant from QA',
          sourceRecordingIdsJson: '["recording-1"]',
          sourceKBEntryIdsJson: '["kb-1"]',
          flaggedByExpert: true,
          expertCorrection: 'Corrected answer',
          createdAt: '2026-05-09T06:02:00.000Z',
        }),
      ],
    );

    expect(merged.map((message) => message.id)).toEqual(['assistant-1', 'user-1']);
    expect(merged[0]).toMatchObject({
      content: 'Assistant from QA',
      sourceRecordingIdsJson: '["recording-1"]',
      sourceKBEntryIdsJson: '["kb-1"]',
      flaggedByExpert: true,
      expertCorrection: 'Corrected answer',
    });
    expect(merged[1]?.content).toBe('User from QA');
  });

  it('falls back to QA messages sorted by createdAt when RAG is empty', () => {
    const merged = mergeRagAndQaToChatMessages(
      [],
      [
        qaMessage({ id: 'second', content: 'Second', createdAt: '2026-05-09T06:02:00.000Z' }),
        qaMessage({ id: 'first', content: 'First', createdAt: '2026-05-09T06:01:00.000Z' }),
      ],
    );

    expect(merged.map((message) => message.id)).toEqual(['first', 'second']);
    expect(merged.map((message) => message.content)).toEqual(['First', 'Second']);
  });

  it('uses RAG messages and source ids when QA is empty', () => {
    const merged = mergeRagAndQaToChatMessages(
      [
        ragMessage({
          id: 'assistant-1',
          sources: [
            { type: 'Recording', id: 'recording-1', title: 'Recording one' },
            { type: 'KBEntry', id: 'kb-1', title: 'KB one' },
          ],
        }),
      ],
      [],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: 'assistant-1',
      role: 'assistant',
      sourceRecordingIdsJson: '["recording-1"]',
      sourceKBEntryIdsJson: '["kb-1"]',
    });
  });

  it('returns an empty list when both sources are empty', () => {
    expect(mergeRagAndQaToChatMessages([], [])).toEqual([]);
  });
});
