import { useMemo } from 'react';

import { useKgAsync } from '@/features/knowledge-graph/hooks/internal/useKgAsync';
import { knowledgeGraphService } from '@/services/knowledgeGraphService';
import type { KnowledgeGraphStats } from '@/types/knowledgeGraphApi';

/**
 * Loads aggregate KG statistics (`GET /api/KnowledgeGraph/stats`).
 * Default `cacheTtlMs` avoids hammering the API when multiple components mount.
 */
export function useKnowledgeGraphStats(options?: {
  enabled?: boolean;
  cacheTtlMs?: number;
}) {
  const fetcher = useMemo(
    () => (signal: AbortSignal) => knowledgeGraphService.getStats(signal),
    [],
  );

  return useKgAsync<KnowledgeGraphStats>('stats:v1', fetcher, {
    enabled: options?.enabled !== false,
    cacheTtlMs: options?.cacheTtlMs ?? 60_000,
  });
}
