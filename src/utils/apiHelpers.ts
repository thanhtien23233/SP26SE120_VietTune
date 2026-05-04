/**
 * Recursively unwrap common API envelope shapes into an array.
 */
export function extractArray<T>(
  data: unknown,
  keys: string[] = ['data', 'items', 'users', 'results', 'result', 'value', 'Data', 'Items'],
): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== 'object') return [];

  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    if (key in obj) {
      const extracted = extractArray<T>(obj[key], keys);
      if (extracted.length > 0) return extracted;
    }
  }
  return [];
}

/**
 * Unwrap common API envelope shapes into an object.
 */
export function extractObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;

  if ('data' in obj) {
    const inner = obj.data;
    if (inner && typeof inner === 'object' && !Array.isArray(inner))
      return inner as Record<string, unknown>;
  }
  if ('item' in obj) {
    const inner = obj.item;
    if (inner && typeof inner === 'object' && !Array.isArray(inner))
      return inner as Record<string, unknown>;
  }
  return obj;
}
