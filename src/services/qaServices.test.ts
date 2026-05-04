import { describe, expect, it, vi } from 'vitest';

import { createQAConversationService } from '@/services/qaConversationService';
import { createQAMessageService } from '@/services/qaMessageService';
import type { ServiceApiClient } from '@/services/serviceApiClient';

function createMockClient(): ServiceApiClient & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  };
}

describe('qa services factory', () => {
  it('creates and fetches conversations with injected client', async () => {
    const client = createMockClient();
    const service = createQAConversationService(client);
    const rows = [{ id: 'c1', userId: 'u1', title: 'Test', createdAt: '2026-01-01' }];

    client.post.mockResolvedValueOnce(undefined);
    client.get.mockResolvedValueOnce({ data: rows });

    await service.createQAConversation(rows[0]);
    const result = await service.fetchUserConversations('u1');

    expect(client.post).toHaveBeenCalledWith('/QAConversation', rows[0]);
    expect(client.get).toHaveBeenCalledWith('/QAConversation/get-by-user', {
      params: { userId: 'u1' },
    });
    expect(result).toEqual(rows);
  });

  it('returns empty conversations on fetch error', async () => {
    const client = createMockClient();
    const service = createQAConversationService(client);
    client.get.mockRejectedValueOnce(new Error('boom'));

    await expect(service.fetchUserConversations('u1')).resolves.toEqual([]);
  });

  it('handles message APIs using injected client', async () => {
    const client = createMockClient();
    const service = createQAMessageService(client);
    const message = {
      id: 'm1',
      conversationId: 'c1',
      role: 1,
      content: 'hello',
      createdAt: '2026-01-01',
    };

    client.post.mockResolvedValueOnce(undefined);
    client.get.mockResolvedValueOnce([message]);
    client.put.mockResolvedValue(undefined);

    await service.createQAMessage(message);
    await expect(service.fetchConversationMessages('c1')).resolves.toEqual([message]);
    await service.flagMessage('m1');
    await service.unflagMessage('m1');

    expect(client.post).toHaveBeenCalledWith('/QAMessage', message);
    expect(client.get).toHaveBeenCalledWith('/QAMessage/get-by-conversation', {
      params: { conversationId: 'c1' },
    });
    expect(client.put).toHaveBeenNthCalledWith(1, '/QAMessage/flagged', { id: 'm1' });
    expect(client.put).toHaveBeenNthCalledWith(2, '/QAMessage/unflagged', { id: 'm1' });
  });
});
