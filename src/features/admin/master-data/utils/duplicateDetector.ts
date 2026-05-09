import { normalizeSlug } from './slugNormalizer';

export function isDuplicateName(
  newName: string,
  existingItems: { id: string; name: string }[],
  currentId?: string,
): boolean {
  if (!newName) return false;
  const newSlug = normalizeSlug(newName);

  return existingItems.some(
    (item) => item.id !== currentId && normalizeSlug(item.name) === newSlug,
  );
}
