export function normalizeSearchText(input: string): string {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Đ/g, 'D')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchText(input: string): string[] {
  const normalized = normalizeSearchText(input);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true;
  let j = 0;
  for (let i = 0; i < haystack.length && j < needle.length; i += 1) {
    if (haystack[i] === needle[j]) j += 1;
  }
  return j === needle.length;
}

function scoreToken(token: string, normalizedOption: string): number {
  if (!token) return 0;
  if (normalizedOption === token) return 500;
  if (normalizedOption.startsWith(token)) return 300;
  if (normalizedOption.includes(` ${token}`)) return 220;
  if (normalizedOption.includes(token)) return 160;
  if (isSubsequence(token, normalizedOption)) return 80;
  return -1;
}

/**
 * Returns a ranking score for an option against a query.
 * Higher is better. Returns -1 when option should be excluded.
 */
export function scoreSearchOption(option: string, query: string): number {
  const normalizedOption = normalizeSearchText(option);
  const tokens = tokenizeSearchText(query);
  if (!tokens.length) return 0;

  let score = 0;
  for (const token of tokens) {
    const tokenScore = scoreToken(token, normalizedOption);
    if (tokenScore < 0) return -1;
    score += tokenScore;
  }
  return score;
}
