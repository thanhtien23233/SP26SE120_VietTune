import { describe, expect, it } from 'vitest';

import {
  ADMIN_ROUTE_POLICY,
  RESEARCHER_ROUTE_POLICY,
  evaluateGuardAccess,
  getDefaultPostLoginPath,
  parseSafeRedirectParam,
  resolvePostLoginPath,
} from './routeAccess';

import { UserRole, type User } from '@/types';


function makeUser(role: UserRole, isActive = true): User {
  return {
    id: 'u1',
    username: 'tester',
    email: 'tester@example.com',
    fullName: 'Tester',
    role,
    isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('routeAccess', () => {
  it('redirects unauthenticated users to login', () => {
    const d = evaluateGuardAccess(null, '/admin', ADMIN_ROUTE_POLICY);
    expect(d.status).toBe('redirect');
    if (d.status === 'redirect') {
      expect(d.reason).toBe('unauthenticated');
      expect(d.redirectTo).toContain('/login?redirect=');
    }
  });

  it('blocks unauthorized role', () => {
    const d = evaluateGuardAccess(makeUser(UserRole.CONTRIBUTOR), '/admin', ADMIN_ROUTE_POLICY);
    expect(d.status).toBe('redirect');
    if (d.status === 'redirect') {
      expect(d.reason).toBe('unauthorized');
      expect(d.redirectTo).toBe('/403');
    }
  });

  it('allows researcher route for researcher', () => {
    const d = evaluateGuardAccess(
      makeUser(UserRole.RESEARCHER),
      '/researcher',
      RESEARCHER_ROUTE_POLICY,
    );
    expect(d).toEqual({ status: 'allow' });
  });

  it('resolves post-login redirect safely by role', () => {
    const contributor = makeUser(UserRole.CONTRIBUTOR);
    expect(resolvePostLoginPath(contributor, '/moderation')).toBe('/');
    expect(resolvePostLoginPath(contributor, '/explore')).toBe('/explore');
    expect(getDefaultPostLoginPath(makeUser(UserRole.ADMIN))).toBe('/admin');
  });

  it('parseSafeRedirectParam rejects open redirects', () => {
    expect(parseSafeRedirectParam('/explore')).toBe('/explore');
    expect(parseSafeRedirectParam('//evil.com')).toBe(null);
    expect(parseSafeRedirectParam('https://evil.com')).toBe(null);
    expect(parseSafeRedirectParam(null)).toBe(null);
    expect(parseSafeRedirectParam('')).toBe(null);
  });
});
