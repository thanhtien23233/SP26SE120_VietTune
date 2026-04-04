import { api } from "./api";
import { Recording } from "@/types";

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
  return api.get<SemanticSearchResult[]>("/api/search/semantic", {
    params: {
      q: params.q,
      topK: params.topK ?? 10,
      minScore: params.minScore ?? 0.5,
    },
  });
};

export const semanticSearchService = {
  searchSemantic,
};
