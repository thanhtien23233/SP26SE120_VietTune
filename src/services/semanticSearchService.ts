import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type { ApiSemanticSearchQuery } from '@/api';
import { Recording } from '@/types';

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
  const query: ApiSemanticSearchQuery = {
    q: params.q,
    topK: params.topK ?? 10,
    minScore: params.minScore ?? 0.7,
  };
  return apiOk(
    asApiEnvelope<SemanticSearchResult[]>(
      apiFetch.GET('/api/search/semantic', {
        params: { query },
      }),
    ),
  );
};

export const semanticSearchService = {
  searchSemantic,
};
