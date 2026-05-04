import type { CreateKBCitationRequest } from '@/types/knowledgeBase';

/** Strip empty citation rows for API payload */
export function filterValidCitations(rows: CreateKBCitationRequest[]): CreateKBCitationRequest[] {
  return rows
    .map((r) => ({
      citation: r.citation.trim(),
      url: r.url?.trim() ? r.url.trim() : null,
    }))
    .filter((r) => r.citation.length > 0);
}
