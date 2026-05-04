import { describe, expect, it } from 'vitest';

import { extractArray, extractObject } from './apiHelpers';

describe('apiHelpers', () => {
  describe('extractArray', () => {
    it('returns array directly', () => {
      expect(extractArray<number>([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('unwraps nested envelope keys', () => {
      const payload = {
        Data: {
          items: [{ id: 'a' }, { id: 'b' }],
        },
      };
      expect(extractArray<{ id: string }>(payload)).toEqual([{ id: 'a' }, { id: 'b' }]);
    });

    it('returns empty array for non-array payloads', () => {
      expect(extractArray<string>({ foo: 'bar' })).toEqual([]);
      expect(extractArray<string>(null)).toEqual([]);
    });
  });

  describe('extractObject', () => {
    it('unwraps data object', () => {
      expect(extractObject({ data: { id: 'x' } })).toEqual({ id: 'x' });
    });

    it('unwraps item object', () => {
      expect(extractObject({ item: { id: 'x' } })).toEqual({ id: 'x' });
    });

    it('returns null for invalid input', () => {
      expect(extractObject(null)).toBeNull();
      expect(extractObject('text')).toBeNull();
    });
  });
});
