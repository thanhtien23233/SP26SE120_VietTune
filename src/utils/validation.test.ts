import { describe, expect, it } from 'vitest';

import { isUuid, validateEmail, validatePassword } from './validation';

describe('validation utils', () => {
  it('validates email format', () => {
    expect(validateEmail('tester@example.com')).toBe(true);
    expect(validateEmail('not-an-email')).toBe(false);
  });

  it('validates password complexity', () => {
    const strong = validatePassword('Abcdef1');
    expect(strong.valid).toBe(true);
    expect(strong.errors).toEqual([]);

    const weak = validatePassword('abc');
    expect(weak.valid).toBe(false);
    expect(weak.errors.length).toBeGreaterThan(0);
  });

  describe('isUuid', () => {
    it('accepts standard v4 UUIDs', () => {
      expect(isUuid('50eda7e7-3a33-4873-a706-804b0d19a167')).toBe(true);
      expect(isUuid('d756c5dd-0264-4ebc-9afc-c154815d8392')).toBe(true);
    });

    it('accepts seed/test UUIDs with zero version and variant', () => {
      expect(isUuid('00000000-0000-0000-0007-000000000006')).toBe(true);
      expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(isUuid('')).toBe(false);
      expect(isUuid('not-a-uuid')).toBe(false);
      expect(isUuid('12345678-1234-1234-1234')).toBe(false);
      expect(isUuid('ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ')).toBe(false);
    });
  });
});
