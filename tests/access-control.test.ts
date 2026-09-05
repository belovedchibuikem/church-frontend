import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessContextFromCapabilities,
  churchTenantHomePath,
  designFixtureAccessContext,
  emptyAccessContext,
  evaluateAccess,
  evaluateMemberAccess,
  formatCapabilityScope,
  resolveAdminGuestLoginRedirect,
  type AccessContext,
} from '../lib/access-control.ts';
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

test('empty access context is fail-closed', () => {
  assert.deepEqual(emptyAccessContext(), {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
});

test('member access only requires authentication', () => {
  assert.deepEqual(evaluateMemberAccess(emptyAccessContext()), { allowed: false, reason: 'unauthenticated' });
  assert.deepEqual(evaluateMemberAccess(context()), { allowed: true });
  assert.deepEqual(evaluateMemberAccess(designFixtureAccessContext()), { allowed: true });
});

test('design fixture grants wildcard access for review', () => {
  const fixture = designFixtureAccessContext();
  assert.equal(fixture.authenticated, true);
  assert.ok(fixture.permissions.includes('*'));
  assert.ok(fixture.scopes.includes('global'));
  assert.deepEqual(evaluateAccess(dashboard, fixture), { allowed: true });
});

test('capability scopes map to evaluateAccess tokens', () => {
  assert.deepEqual(formatCapabilityScope({ type: 'global', key: 'platform' }), ['global', 'global:platform']);
  assert.deepEqual(formatCapabilityScope({ type: 'country', key: 'nigeria' }), ['country:nigeria']);
  const live = accessContextFromCapabilities({
    permissions: ['admin.dashboard.view'],
    scopes: [
      { type: 'global', key: 'platform' },
      { type: 'country', key: 'nigeria' },
    ],
  });
  assert.equal(live.authenticated, true);
  assert.ok(live.scopes.includes('global'));
  assert.ok(live.scopes.includes('country:nigeria'));
  assert.deepEqual(evaluateAccess(dashboard, live, 'country:nigeria'), { allowed: true });
});

test('live administrator bundles receive UI access even when catalog permission codes differ', () => {
  const live = accessContextFromCapabilities({
    permissions: ['platform.configuration.manage', 'identity.users.view'],
    scopes: [{ type: 'global', key: 'platform' }],
  });
  assert.ok(live.permissions.includes('*'));
  assert.deepEqual(evaluateAccess(dashboard, live), { allowed: true });
});

test('member self-service capabilities do not open the admin console', () => {
  const member = accessContextFromCapabilities({
    permissions: ['identity.security.sessions.view', 'identity.preferences.manage', 'mobile.app.access'],
    scopes: [{ type: 'global', key: 'platform' }],
  });
  assert.equal(member.permissions.includes('*'), false);
  assert.deepEqual(evaluateAccess(dashboard, member), { allowed: false, reason: 'permission-denied' });
});

test('church-tenant administrators do not receive a platform wildcard', () => {
  const churchId = '01JABCDEFGHJKMNPQRSTVWXYZ0';
  const live = accessContextFromCapabilities({
    permissions: ['church.churches.view', 'church.churches.manage', 'church.finance.view'],
    scopes: [{ type: 'church', key: churchId }],
  });
  assert.equal(live.permissions.includes('*'), false);
  assert.equal(churchTenantHomePath(live), '/admin/church/dashboard');
  assert.deepEqual(
    evaluateAccess(getAdminScreen('/admin/church/dashboard')!, live, `church:${churchId}`),
    { allowed: true },
  );
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca')!, live, `church:${churchId}`).allowed, false);
  assert.equal(evaluateAccess(getAdminScreen('/admin/finance')!, live, `church:${churchId}`).allowed, false);
});

test('public routes are available without a session', () => {
  assert.deepEqual(evaluateAccess(publicLogin, context({ authenticated: false })), { allowed: true });
});

test('protected routes deny unauthenticated direct URL access', () => {
  assert.deepEqual(evaluateAccess(dashboard, context({ authenticated: false })), { allowed: false, reason: 'unauthenticated' });
});

test('guests hitting admin are sent to admin login, not member login or the dashboard', () => {
  const denied = evaluateAccess(dashboard, context({ authenticated: false }));
  assert.equal(
    resolveAdminGuestLoginRedirect({
      authenticated: false,
      route: '/admin',
      screenKind: 'dashboard',
      decision: denied,
    }),
    '/admin/login?returnTo=%2Fadmin',
  );
  assert.equal(
    resolveAdminGuestLoginRedirect({
      authenticated: false,
      route: '/admin/login',
      screenKind: 'login',
      decision: { allowed: true },
      returnTo: '/admin/settings/platform',
    }),
    null,
  );
  assert.equal(
    resolveAdminGuestLoginRedirect({
      authenticated: true,
      route: '/admin',
      screenKind: 'dashboard',
      decision: { allowed: false, reason: 'permission-denied' },
    }),
    null,
  );
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

test('KCA lecturer permissions unlock attendance, evidence review, and assessments', () => {
  const lecturerPermissions = [
    'kca.enrollments.view',
    'kca.applications.view',
    'kca.attendance.record',
    'kca.evidence.view',
    'kca.evidence.review',
    'kca.assessments.view',
    'kca.assessments.record',
    'kca.assignments.transition',
  ];
  const lecturer = context({ permissions: lecturerPermissions, scopes: ['global'] });
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca/attendance')!, lecturer).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca/evidence-reviews')!, lecturer).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca/assessments/final')!, lecturer).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca/students')!, lecturer).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/kca/modules/new')!, lecturer).allowed, false);
});
