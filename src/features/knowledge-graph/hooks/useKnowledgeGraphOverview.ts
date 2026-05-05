import { useMemo } from 'react';

import { useKgAsync } from '@/features/knowledge-graph/hooks/internal/useKgAsync';
import {
  toRemoteGraphPayload,
  type KnowledgeGraphRemoteGraphPayload,
} from '@/features/knowledge-graph/utils/knowledgeGraphApiAdapter';
import { knowledgeGraphService } from '@/services/knowledgeGraphService';

/**
 * Loads the global KG overview (`GET /api/KnowledgeGraph/overview`).
 * Uses `toRemoteGraphPayload` so consumers get both `graph` (viewer-ready) and `raw` API rows.
 */
export function useKnowledgeGraphOverview(options?: {
  maxNodes?: number;
  enabled?: boolean;
  /** Optional short TTL cache (ms); `refetch()` bypasses cache. */
  cacheTtlMs?: number;
}) {
  const maxNodes = options?.maxNodes ?? 100;
  const enabled = options?.enabled !== false;
  const requestKey = `overview:${maxNodes}`;

  const fetcher = useMemo(
    () => async (signal: AbortSignal) => {
      const raw = await knowledgeGraphService.getOverview({ maxNodes, signal });
      return toRemoteGraphPayload(raw);
    },
    [maxNodes],
  );

  return useKgAsync<KnowledgeGraphRemoteGraphPayload>(requestKey, fetcher, {
    enabled,
    cacheTtlMs: options?.cacheTtlMs ?? 0,
  });
}
