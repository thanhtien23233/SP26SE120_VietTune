import { useMemo, useRef } from 'react';

import { useKgAsync } from '@/features/knowledge-graph/hooks/internal/useKgAsync';
import {
  toRemoteGraphPayload,
  type KnowledgeGraphRemoteGraphPayload,
} from '@/features/knowledge-graph/utils/knowledgeGraphApiAdapter';
import { knowledgeGraphService } from '@/services/knowledgeGraphService';

function stableFilterKey(filterTypes: string[] | null | undefined): string {
  if (!filterTypes?.length) return '';
  return [...filterTypes].sort().join('|');
}

/**
 * Loads a subgraph around one node (`POST /api/KnowledgeGraph/explore`).
 * Disabled until both `nodeId` and `nodeType` are non-empty; changing params aborts the prior request.
 */
export function useKnowledgeGraphExplore(params: {
  nodeId: string;
  nodeType: string;
  depth?: number;
  maxNodes?: number;
  filterTypes?: string[] | null;
  enabled?: boolean;
}) {
  const nodeId = params.nodeId?.trim() ?? '';
  const nodeType = params.nodeType?.trim() ?? '';
  const enabled =
    params.enabled !== false && nodeId.length > 0 && nodeType.length > 0;

  const filterKey = stableFilterKey(params.filterTypes);
  const requestKey = enabled
    ? `explore:${nodeId}:${nodeType}:${params.depth ?? 1}:${params.maxNodes ?? 50}:${filterKey}`
    : 'explore:disabled';

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetcher = useMemo(
    () => async (signal: AbortSignal) => {
      const p = paramsRef.current;
      const raw = await knowledgeGraphService.exploreNode(
        {
          nodeId,
          nodeType,
          depth: p.depth,
          maxNodes: p.maxNodes,
          filterTypes: p.filterTypes,
        },
        signal,
      );
      return toRemoteGraphPayload(raw);
    },
    [nodeId, nodeType],
  );

  return useKgAsync<KnowledgeGraphRemoteGraphPayload>(requestKey, fetcher, {
    enabled,
    cacheTtlMs: 0,
  });
}
