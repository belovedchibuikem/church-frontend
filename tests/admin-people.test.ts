import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const landings = [
  '/admin/people/dashboard',
  '/admin/people',
  '/admin/people/first-timers',
  '/admin/people/follow-up',
  '/admin/people/converts',
  '/admin/people/discipleship',
  '/admin/people/workers',
  '/admin/people/leaders',
  '/admin/people/ministry-history',
  '/admin/people/prayer-requests',
  '/admin/people/needs',
  '/admin/people/counselling',
  '/admin/people/testimonies',
  '/admin/people/safeguarding',
  '/admin/people/reports',
  '/admin/people/settings',
];

test('people landing pages are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('dynamic person ULID routes resolve', () => {
  const id = '01JABCDEFGHJKMNPQRSTVWXYZ0';
  assert.equal(getAdminScreen(`/admin/people/${id}`)?.kind, 'detail');
  assert.equal(getAdminScreen(`/admin/people/${id}/edit`)?.kind, 'detail');
  assert.equal(getAdminScreen(`/admin/people/counselling/${id}`)?.kind, 'restricted');
});

test('people directory permission aliases Laravel church view', () => {
  const screen = getAdminScreen('/admin/people')!;
  const allowed = evaluateAccess(screen, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['church.churches.view'],
    scopes: ['global'],
  });
  assert.equal(allowed.allowed, true);
});

test('unauthenticated people access is unauthenticated', () => {
  const screen = getAdminScreen('/admin/people')!;
  const decision = evaluateAccess(screen, {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, 'unauthenticated');
});
