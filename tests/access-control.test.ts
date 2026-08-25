import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess, type AccessContext } from '../lib/access-control.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const dashboard = getAdminScreen('/admin')!;
const countryReport = getAdminScreen('/admin/reports/country-performance')!;
const publicLogin = getAdminScreen('/admin/login')!;
const homeChurchStatus = getAdminScreen('/admin/home-churches/grace-home-church/status')!;
const restrictedCase = getAdminScreen('/admin/people/counselling/case-c-2024-0012')!;

const newMinistryRoutes = [
  {
    batch: 'G',
    screen: getAdminScreen('/admin/kca')!,
    permission: 'kca.dashboard.view',
  },
  {
    batch: 'H',
    screen: getAdminScreen('/admin/kca/students')!,
    permission: 'kca.student.view',
  },
  {
    batch: 'I',
    screen: getAdminScreen('/admin/mission')!,
    permission: 'mission.dashboard.view',
  },
  { batch: 'J', screen: getAdminScreen('/admin/press')!, permission: 'press.dashboard.view' },
  { batch: 'K', screen: getAdminScreen('/admin/finance')!, permission: 'finance.dashboard.view' },
  { batch: 'L', screen: getAdminScreen('/admin/settings/platform')!, permission: 'settings.platform.manage' },
  { batch: 'M', screen: getAdminScreen('/admin/communications')!, permission: 'communications.dashboard.view' },
  { batch: 'N', screen: getAdminScreen('/admin/reports')!, permission: 'reports.global.view' },
  { batch: 'O', screen: getAdminScreen('/admin/security')!, permission: 'security.dashboard.view' },
] as const;

const highRiskRoutes = [
  {
    id: 'G-12',
    screen: getAdminScreen('/admin/kca/applications/samuel-david/decision')!,
    permission: 'kca.application.decide',
    lowerPrivilege: 'kca.application.view',
  },
  {
    id: 'H-10',
    screen: getAdminScreen('/admin/kca/modules/new')!,
    permission: 'kca.module.create',
    lowerPrivilege: 'kca.module.view',
  },
  {
    id: 'I-06',
    screen: getAdminScreen('/admin/mission/crusades/lagos-mega-crusade/invitations/rccg-city-chapel')!,
    permission: 'mission.invitation.review',
    lowerPrivilege: 'mission.invitation.view',
  },
] as const;

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

for (const { batch, screen, permission } of newMinistryRoutes) {
  test(`${batch} routes enforce authentication, MFA, permission, and scope`, () => {
    assert.ok(screen, `${batch} representative route must exist`);
    assert.deepEqual(
      evaluateAccess(screen, context({ authenticated: false, permissions: [permission] }), 'country:nigeria'),
      { allowed: false, reason: 'unauthenticated' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ mfaVerified: false, permissions: [permission] }), 'country:nigeria'),
      { allowed: false, reason: 'mfa-required' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: ['unrelated.permission'] }), 'country:nigeria'),
      { allowed: false, reason: 'permission-denied' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: [permission] }), 'country:ghana'),
      { allowed: false, reason: 'scope-denied' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: [permission] }), 'country:nigeria'),
      { allowed: true },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: ['*'], scopes: ['global'] }), 'country:ghana'),
      { allowed: true },
    );
  });
}

for (const { id, screen, permission, lowerPrivilege } of highRiskRoutes) {
  test(`${id} high-risk action requires its explicit capability and assigned scope`, () => {
    assert.ok(screen, `${id} route must exist`);
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: [lowerPrivilege] }), 'country:nigeria'),
      { allowed: false, reason: 'permission-denied' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: [permission] }), 'country:ghana'),
      { allowed: false, reason: 'scope-denied' },
    );
    assert.deepEqual(
      evaluateAccess(screen, context({ permissions: [permission] }), 'country:nigeria'),
      { allowed: true },
    );
  });
}
