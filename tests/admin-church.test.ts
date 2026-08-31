import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const landings = [
  '/admin/church/dashboard',
  '/admin/churches',
  '/admin/churches/new',
  '/admin/church/leadership',
  '/admin/church/members',
  '/admin/church/first-timers',
  '/admin/church/converts',
  '/admin/church/disciples',
  '/admin/church/workers',
  '/admin/church/departments',
  '/admin/church/small-groups',
  '/admin/church/evangelism',
  '/admin/church/attendance',
  '/admin/church/reports',
  '/admin/church/finance',
  '/admin/church/settings',
];

test('church landing pages are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('dynamic church ULID nested routes resolve', () => {
  const id = '01JABCDEFGHJKMNPQRSTVWXYZ0';
  assert.equal(getAdminScreen(`/admin/churches/${id}`)?.batch, 'E');
  assert.equal(getAdminScreen(`/admin/churches/${id}/members`)?.id, 'E-06');
  assert.equal(getAdminScreen(`/admin/churches/${id}/leadership`)?.id, 'E-05');
  assert.equal(getAdminScreen(`/admin/churches/${id}/settings`)?.id, 'E-16');
  assert.ok(getAdminScreen(`/admin/churches/${id}/edit`));
  assert.equal(getAdminScreen(`/admin/churches/${id}/attendance`)?.id, 'E-30');
});

test('church UI permissions accept Laravel church aliases', () => {
  const churches = getAdminScreen('/admin/churches')!;
  const allowed = evaluateAccess(churches, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['church.churches.view'],
    scopes: ['global'],
  });
  assert.equal(allowed.allowed, true);

  const denied = evaluateAccess(churches, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view'],
    scopes: ['global'],
  });
  assert.equal(denied.allowed, false);
});

test('unauthenticated church access is unauthenticated not forbidden', () => {
  const screen = getAdminScreen('/admin/churches')!;
  const decision = evaluateAccess(screen, {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, 'unauthenticated');
});
