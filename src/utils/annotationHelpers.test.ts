import { describe, expect, it } from 'vitest';

import { formatSecondsToTime, isLikelyHttpUrl, parseOptionalInt } from './annotationHelpers';

describe('annotationHelpers', () => {
  describe('isLikelyHttpUrl', () => {
    it('returns true for http and https URLs', () => {
      expect(isLikelyHttpUrl('https://example.com/path')).toBe(true);
      expect(isLikelyHttpUrl('http://localhost:3000')).toBe(true);
      expect(isLikelyHttpUrl('  https://doi.org/10.1234/x  ')).toBe(true);
    });

    it('returns false for non-http schemes or plain text', () => {
      expect(isLikelyHttpUrl('ftp://x')).toBe(false);
      expect(isLikelyHttpUrl('example.com')).toBe(false);
      expect(isLikelyHttpUrl('')).toBe(false);
      expect(isLikelyHttpUrl('DOI 10.1234/x')).toBe(false);
    });
  });

  describe('formatSecondsToTime', () => {
    it('formats MM:SS under one hour', () => {
      expect(formatSecondsToTime(0)).toBe('00:00');
      expect(formatSecondsToTime(65)).toBe('01:05');
      expect(formatSecondsToTime(3599)).toBe('59:59');
    });

    it('formats HH:MM:SS when hours > 0', () => {
      expect(formatSecondsToTime(3600)).toBe('01:00:00');
      expect(formatSecondsToTime(3661)).toBe('01:01:01');
    });

    it('floors fractional seconds', () => {
      expect(formatSecondsToTime(1.9)).toBe('00:01');
    });

    it('returns whenInvalid for null, NaN, negative, or non-finite', () => {
      expect(formatSecondsToTime(null)).toBe('-');
      expect(formatSecondsToTime(-1)).toBe('-');
      expect(formatSecondsToTime(Number.NaN)).toBe('-');
      expect(formatSecondsToTime(null, '')).toBe('');
    });
  });

  describe('parseOptionalInt', () => {
    it('returns null for empty or whitespace-only', () => {
      expect(parseOptionalInt('')).toBe(null);
      expect(parseOptionalInt('   ')).toBe(null);
    });

    it('returns integer for valid non-negative strings', () => {
      expect(parseOptionalInt('0')).toBe(0);
      expect(parseOptionalInt(' 42 ')).toBe(42);
    });

    it('returns NaN for invalid values', () => {
      expect(Number.isNaN(parseOptionalInt('1.5'))).toBe(true);
      expect(Number.isNaN(parseOptionalInt('-3'))).toBe(true);
      expect(Number.isNaN(parseOptionalInt('abc'))).toBe(true);
    });
  });
});
