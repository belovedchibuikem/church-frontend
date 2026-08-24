import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess, type AccessContext } from '../lib/access-control.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const dashboard = getAdminScreen('/admin')!;
const countryReport = getAdminScreen('/admin/reports/country-performance')!;
const publicLogin = getAdminScreen('/admin/login')!;

const context = (overrides: Partial<AccessContext> = {}): AccessContext => ({
  authenticated: true,
  mfaVerified: true,
  permissions: ['admin.dashboard.view'],
  scopes: ['country:nigeria'],
  ...overrides,
});

test('public routes are available without a session', () => {
  assert.deepEqual(evaluateAccess(publicLogin, context({ authenticated: false })), { allowed: true });
});

test('protected routes deny unauthenticated direct URL access', () => {
  assert.deepEqual(evaluateAccess(dashboard, context({ authenticated: false })), { allowed: false, reason: 'unauthenticated' });
});

test('privileged routes require MFA', () => {
  assert.deepEqual(evaluateAccess(dashboard, context({ mfaVerified: false })), { allowed: false, reason: 'mfa-required' });
});

test('incorrect permission is denied', () => {
  assert.deepEqual(evaluateAccess(dashboard, context({ permissions: ['identity.user.view'] })), { allowed: false, reason: 'permission-denied' });
});

test('assigned scope cannot be broadened by URL', () => {
  assert.deepEqual(evaluateAccess(dashboard, context(), 'country:ghana'), { allowed: false, reason: 'scope-denied' });
});

test('global pages require global scope', () => {
  assert.deepEqual(evaluateAccess(countryReport, context({ permissions: ['reports.view'] })), { allowed: false, reason: 'scope-denied' });
});

test('wildcard capability and global scope allow authorized route', () => {
  assert.deepEqual(evaluateAccess(countryReport, context({ permissions: ['*'], scopes: ['global'] })), { allowed: true });
});
