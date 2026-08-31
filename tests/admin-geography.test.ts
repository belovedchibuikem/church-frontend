import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const geographyLandings = [
  '/admin/geography',
  '/admin/geography/countries',
  '/admin/geography/regions',
  '/admin/geography/local-areas',
  '/admin/geography/organizations',
  '/admin/geography/hierarchy',
  '/admin/geography/map',
  '/admin/geography/church-hierarchy',
  '/admin/geography/home-church-hierarchy',
  '/admin/geography/reports',
  '/admin/geography/settings',
  '/admin/geography/scope-assignment',
];

test('geography landing pages are catalogued', () => {
  for (const route of geographyLandings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('dynamic geography country and unit routes resolve', () => {
  const country = getAdminScreen('/admin/geography/countries/NG');
  assert.ok(country);
  assert.equal(country.batch, 'C');
  const unit = getAdminScreen('/admin/geography/units/01JABCDEFGHJKMNPQRSTVWXYZ0');
  assert.ok(unit);
  const levels = getAdminScreen('/admin/geography/countries/NG/levels');
  assert.ok(levels);
  const regions = getAdminScreen('/admin/geography/regions');
  assert.ok(regions);
  const localAreas = getAdminScreen('/admin/geography/countries/NG/local-areas');
  assert.ok(localAreas);
  const organization = getAdminScreen('/admin/geography/organizations/01JABCDEFGHJKMNPQRSTVWXYZ0');
  assert.ok(organization);
  assert.equal(organization.kind, 'detail');
});

test('geography UI permissions accept Laravel organization aliases', () => {
  const countries = getAdminScreen('/admin/geography/countries')!;
  const allowed = evaluateAccess(countries, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['organization.countries.view'],
    scopes: ['global'],
  });
  assert.equal(allowed.allowed, true);

  const denied = evaluateAccess(countries, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view'],
    scopes: ['global'],
  });
  assert.equal(denied.allowed, false);
});

test('unauthenticated geography access is unauthenticated not forbidden', () => {
  const screen = getAdminScreen('/admin/geography/map')!;
  const decision = evaluateAccess(screen, {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, 'unauthenticated');
});
