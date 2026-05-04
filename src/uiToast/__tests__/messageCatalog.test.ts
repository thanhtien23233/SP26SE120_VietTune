import { describe, expect, it } from 'vitest';

import { MESSAGE_CATALOG, resolveCatalogMessage } from '../messageCatalog';

describe('MESSAGE_CATALOG + resolveCatalogMessage', () => {
  it('moderation.wizard.step_incomplete interpolates step', () => {
    expect(resolveCatalogMessage('moderation.wizard.step_incomplete', { step: 3 })).toContain(
      'Bước 3',
    );
  });

  it('every catalog entry is non-empty string', () => {
    for (const [key, value] of Object.entries(MESSAGE_CATALOG)) {
      expect(typeof value, key).toBe('string');
      expect(value.trim().length, key).toBeGreaterThan(0);
    }
  });
});
