import { describe, expect, it } from 'vitest';
import { decideTabAccess } from './tabAccess';

const base = { userId: 'u1', isAuthenticated: true, isAdminUser: false, hasActiveMembership: true };

describe('decideTabAccess', () => {
  it('blocks the admin tab for non-admins, even with bypassAuth', () => {
    expect(decideTabAccess({ ...base, tab: 'admin' })).toBe('admin-denied');
    expect(decideTabAccess({ ...base, tab: 'admin', bypassAuth: true })).toBe('admin-denied');
    expect(decideTabAccess({ ...base, tab: 'admin', isAdminUser: true })).toBe('allow');
  });
  it('lets guests see only landing, explore, support and legal pages', () => {
    const guest = { ...base, userId: '', isAuthenticated: false };
    for (const tab of ['landing', 'explore', 'support', 'legal-terms']) {
      expect(decideTabAccess({ ...guest, tab })).toBe('allow');
    }
    expect(decideTabAccess({ ...guest, tab: 'community' })).toBe('login-required');
    expect(decideTabAccess({ ...guest, userId: 'user-guest-1', tab: 'community' })).toBe('login-required');
    expect(decideTabAccess({ ...guest, tab: 'community', bypassAuth: true })).toBe('allow');
  });
  it('requires a membership for Cosmo (aichat)', () => {
    expect(decideTabAccess({ ...base, tab: 'aichat', hasActiveMembership: false })).toBe('billing-required');
    expect(decideTabAccess({ ...base, tab: 'aichat', hasActiveMembership: false, bypassAuth: true })).toBe('allow');
    expect(decideTabAccess({ ...base, tab: 'aichat' })).toBe('allow');
  });
});
