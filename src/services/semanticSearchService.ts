import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type { ApiSemanticSearchQuery } from '@/api';
import { Recording } from '@/types';

const SEMANTIC_CIRCUIT_BREAKER_MS = 3 * 60 * 1000;
let semanticBlockedUntil = 0;

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  if (!response || typeof response !== 'object') return undefined;
  const status = response.status;
  return typeof status === 'number' ? status : undefined;
}

export interface SemanticSearchResult {
  recording: Recording;
  similarityScore: number;
  matchedText?: string;
}

export interface SemanticSearchRequestParams {
  q: string;
  topK?: number;
  minScore?: number;
}

/**
 * Calls the backend Semantic Search endpoint
 */
export const searchSemantic = async (
  params: SemanticSearchRequestParams,
): Promise<SemanticSearchResult[]> => {
  if (Date.now() < semanticBlockedUntil) {
    throw new Error('Semantic search temporarily unavailable');
  }

  const query: ApiSemanticSearchQuery = {
    q: params.q,
    topK: params.topK ?? 10,
    minScore: params.minScore ?? 0.7,
  };

  try {
    const result = await apiOk(
      asApiEnvelope<SemanticSearchResult[]>(
        apiFetch.GET('/api/search/semantic', {
          params: { query },
        }),
      ),
    );
    semanticBlockedUntil = 0;
    return result;
  } catch (error) {
    const status = getErrorStatus(error);
    if (status != null && status >= 500) {
      semanticBlockedUntil = Date.now() + SEMANTIC_CIRCUIT_BREAKER_MS;
    }
    throw error;
  }
};

export const semanticSearchService = {
  searchSemantic,
};
