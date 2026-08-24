import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess, type AccessContext } from '../lib/access-control.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const dashboard = getAdminScreen('/admin')!;
const countryReport = getAdminScreen('/admin/reports/country-performance')!;
const publicLogin = getAdminScreen('/admin/login')!;
const homeChurchStatus = getAdminScreen('/admin/home-churches/grace-home-church/status')!;
const restrictedCase = getAdminScreen('/admin/people/counselling/case-c-2024-0012')!;

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

test('home church status mutations require their explicit permission', () => {
  assert.deepEqual(evaluateAccess(homeChurchStatus, context({ permissions: ['home_church.view'] })), { allowed: false, reason: 'permission-denied' });
  assert.deepEqual(evaluateAccess(homeChurchStatus, context({ permissions: ['home_church.status.update'] }), 'country:nigeria'), { allowed: true });
});

test('restricted counselling records remain permission and scope guarded', () => {
  assert.deepEqual(evaluateAccess(restrictedCase, context({ permissions: ['counselling.case.view'] })), { allowed: false, reason: 'permission-denied' });
  assert.deepEqual(evaluateAccess(restrictedCase, context({ permissions: ['counselling.case.restricted'] }), 'country:ghana'), { allowed: false, reason: 'scope-denied' });
});
