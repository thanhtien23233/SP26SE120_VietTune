import { describe, expect, it } from 'vitest';

import { getErrorMessage, getHttpStatus, getHttpUrl } from '@/utils/httpError';

describe('getHttpStatus', () => {
  it('returns status from axios-like response', () => {
    expect(getHttpStatus({ response: { status: 404 } })).toBe(404);
    expect(getHttpStatus({ response: { status: 500 } })).toBe(500);
  });

  it('returns undefined when missing or not a number', () => {
    expect(getHttpStatus(new Error('x'))).toBeUndefined();
    expect(getHttpStatus({ response: {} })).toBeUndefined();
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus(undefined)).toBeUndefined();
  });
});

describe('getHttpUrl', () => {
  it('prefers config.url then response.url', () => {
    expect(getHttpUrl({ config: { url: '/api/a' } })).toBe('/api/a');
    expect(getHttpUrl({ response: { url: '/api/b' } })).toBe('/api/b');
    expect(getHttpUrl({ config: { url: '/first' }, response: { url: '/second' } })).toBe('/first');
  });

  it('returns undefined for empty or missing', () => {
    expect(getHttpUrl({ config: { url: '' } })).toBeUndefined();
    expect(getHttpUrl({})).toBeUndefined();
  });
});

describe('getErrorMessage', () => {
  it('reads message from response.data string', () => {
    expect(getErrorMessage({ response: { data: '  Server says no  ' } }, 'fallback')).toBe(
      'Server says no',
    );
  });

  it('reads message from response.data object fields', () => {
    expect(
      getErrorMessage({ response: { data: { message: 'From message' } } }, 'fallback'),
    ).toBe('From message');
    expect(
      getErrorMessage({ response: { data: { Message: 'Pascal' } } }, 'fallback'),
    ).toBe('Pascal');
    expect(
      getErrorMessage({ response: { data: { detail: 'Detail text' } } }, 'fallback'),
    ).toBe('Detail text');
  });

  it('reads message from error-like nested object', () => {
    expect(getErrorMessage({ error: { message: 'Nested' } }, 'fallback')).toBe('Nested');
  });

  it('uses Error.message when present', () => {
    expect(getErrorMessage(new Error('Direct'), 'fallback')).toBe('Direct');
  });

  it('uses top-level message string on error-like object', () => {
    expect(getErrorMessage({ message: '  spaced  ' }, 'fallback')).toBe('spaced');
  });

  it('uses fallback when nothing else matches', () => {
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
    expect(getErrorMessage({ response: { data: {} } }, 'fb')).toBe('fb');
  });
});
