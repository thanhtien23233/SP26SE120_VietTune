import { describe, expect, it, vi } from 'vitest';

import { decodeJwtPayload, isJwtExpired } from '@/utils/jwtExpiry';

describe('jwtExpiry', () => {
  it('decodeJwtPayload returns payload for valid JWT shape', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' })).replace(/=/g, '');
    const payload = btoa(JSON.stringify({ sub: '1', exp: 9999999999 })).replace(/=/g, '');
    const token = `${header}.${payload}.sig`;
    expect(decodeJwtPayload(token)?.sub).toBe('1');
  });

  it('isJwtExpired is false for demo tokens', () => {
    expect(isJwtExpired('demo-token-x')).toBe(false);
  });

  it('isJwtExpired respects exp in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00.000Z'));
    const header = btoa('{}').replace(/=/g, '');
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })).replace(
      /=/g,
      '',
    );
    const token = `${header}.${payload}.x`;
    expect(isJwtExpired(token)).toBe(true);
    vi.useRealTimers();
  });
});
