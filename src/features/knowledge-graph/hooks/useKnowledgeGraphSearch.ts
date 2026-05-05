import { useMemo } from 'react';

import { useKgAsync } from '@/features/knowledge-graph/hooks/internal/useKgAsync';
import { knowledgeGraphService } from '@/services/knowledgeGraphService';
import type { KnowledgeGraphApiNode } from '@/types/knowledgeGraphApi';

/**
 * Keyword search over KG nodes (`GET /api/KnowledgeGraph/search`).
 * Disabled when `query` is shorter than `minQueryLength` (default 1).
 */
export function useKnowledgeGraphSearch(params: {
  query: string;
  types?: string;
  limit?: number;
  enabled?: boolean;
  minQueryLength?: number;
}) {
  const q = params.query.trim();
  const minLen = params.minQueryLength ?? 1;
  const enabled = params.enabled !== false && q.length >= minLen;
  const limit = params.limit ?? 20;
  const types = params.types ?? '';

  const requestKey = enabled ? `search:${q}:${types}:${limit}` : 'search:disabled';

  const fetcher = useMemo(
    () => async (signal: AbortSignal) => {
      return knowledgeGraphService.searchNodes({
        query: q,
        types: types || undefined,
        limit,
        signal,
      });
    },
    [q, types, limit],
  );

  return useKgAsync<KnowledgeGraphApiNode[]>(requestKey, fetcher, {
    enabled,
    cacheTtlMs: 0,
  });
}
