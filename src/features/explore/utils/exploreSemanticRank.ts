import type { Recording } from '@/types';

/** Tokenize for loose accent-insensitive matching (aligned with SemanticSearchPage). */
export function tokenizeExploreSemantic(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/\s+/)
    .filter(Boolean);
}

export function scoreRecordingSemantic(r: Recording, tokens: string[]): number {
  const title = (r.title || '') + ' ' + (r.titleVietnamese || '');
  const desc = r.description || '';
  const ethnicityName =
    typeof r.ethnicity === 'object' && r.ethnicity !== null
      ? (r.ethnicity.name || '') + ' ' + (r.ethnicity.nameVietnamese || '')
      : '';
  const tags = (r.tags || []).join(' ');
  const instruments = (r.instruments ?? [])
    .map((i) => `${i.name ?? ''} ${i.nameVietnamese ?? ''}`)
    .join(' ');
  const searchable = [title, desc, ethnicityName, tags, instruments]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  let score = 0;
  for (const t of tokens) {
    if (searchable.includes(t)) score += 1;
  }
  return score;
}

/** Rank by semantic token overlap; drops zero-score rows (same contract as SemanticSearchPage). */
export function rankRecordingsBySemanticQuery(
  recordings: Recording[],
  rawQuery: string,
): Recording[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) return recordings;
  const tokens = tokenizeExploreSemantic(trimmed);
  if (tokens.length === 0) return recordings;
  return recordings
    .map((r) => ({ r, score: scoreRecordingSemantic(r, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}
