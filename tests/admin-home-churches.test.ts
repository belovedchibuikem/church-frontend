import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const landings = [
  '/admin/home-churches/dashboard',
  '/admin/home-churches/applications',
  '/admin/home-churches/applications/new',
  '/admin/home-churches',
  '/admin/home-churches/leaders',
  '/admin/home-churches/members',
  '/admin/home-churches/attendance',
  '/admin/home-churches/activities',
  '/admin/home-churches/needs',
];

test('home church landing pages are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('dynamic home church and application ULID routes resolve', () => {
  const id = '01JABCDEFGHJKMNPQRSTVWXYZ0';
  const detail = getAdminScreen(`/admin/home-churches/${id}`);
  assert.ok(detail);
  assert.equal(detail.batch, 'D');
  assert.equal(detail.title, 'Home church');
  assert.equal(detail.tabs, undefined);
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/members`)?.id, 'D-09');
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/members`)?.tabs, undefined);
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/attendance`)?.id, 'D-10');
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/activities`)?.id, 'D-11');
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/needs`)?.id, 'D-12');
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/finance`)?.id, 'D-13');
  assert.equal(getAdminScreen(`/admin/home-churches/${id}/status`)?.id, 'D-14');
  const application = getAdminScreen(`/admin/home-churches/applications/${id}`);
  assert.ok(application);
  assert.equal(application.kind, 'detail');
  assert.ok(getAdminScreen(`/admin/home-churches/applications/${id}/review`));
  assert.ok(getAdminScreen(`/admin/home-churches/applications/${id}/decision`));
  assert.ok(getAdminScreen(`/admin/home-churches/applications/${id}/activation`));
});

test('home church UI permissions accept Laravel church aliases', () => {
  const applications = getAdminScreen('/admin/home-churches/applications')!;
  const allowed = evaluateAccess(applications, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['church.home_church_applications.review'],
    scopes: ['global'],
  });
  assert.equal(allowed.allowed, true);

  const denied = evaluateAccess(applications, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view'],
    scopes: ['global'],
  });
  assert.equal(denied.allowed, false);
});

test('unauthenticated home church access is unauthenticated not forbidden', () => {
  const screen = getAdminScreen('/admin/home-churches')!;
  const decision = evaluateAccess(screen, {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, 'unauthenticated');
});

test('home church workspace uses section links instead of duplicate tab buttons', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../components/home-churches-ops.tsx', import.meta.url), 'utf8');
  assert.match(source, /home-church-section-nav/);
  assert.match(source, /HOME_CHURCH_SECTIONS/);
  assert.match(source, /href=\{href\}/);
  assert.doesNotMatch(source, /role="tablist"/);
});
