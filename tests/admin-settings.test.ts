import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';
import { AdminPlatformApiError, isPlatformResourceMissing } from '../lib/admin-platform-api.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const landings = [
  '/admin/settings/platform',
  '/admin/settings/ministry',
  '/admin/settings/church',
  '/admin/settings/home-church-rules',
  '/admin/settings/kca',
  '/admin/settings/mission',
  '/admin/settings/press',
  '/admin/settings/events',
  '/admin/settings/payments',
  '/admin/settings/notifications',
  '/admin/settings/languages',
  '/admin/settings/translation-governance',
  '/admin/settings/feature-flags',
  '/admin/settings/maps',
  '/admin/settings/media',
  '/admin/settings/uploads',
  '/admin/settings/system-information',
  '/admin/settings/ai-api',
  '/admin/settings/branding',
  '/admin/settings/public-site',
  '/admin/communications/settings',
  '/admin/security/configuration',
  '/admin/geography/settings',
];

const aliasCases: Array<{ route: string; permission: string }> = [
  { route: '/admin/settings/platform', permission: 'platform.configuration.view' },
  { route: '/admin/settings/branding', permission: 'platform.configuration.manage' },
  { route: '/admin/settings/church', permission: 'platform.configuration.view' },
  { route: '/admin/settings/home-church-rules', permission: 'church.home_churches.view' },
  { route: '/admin/settings/kca', permission: 'kca.governance.view' },
  { route: '/admin/settings/payments', permission: 'platform.payments.view' },
  { route: '/admin/settings/notifications', permission: 'platform.communications.manage' },
  { route: '/admin/settings/feature-flags', permission: 'platform.feature_flags.view' },
  { route: '/admin/settings/maps', permission: 'platform.maps.view' },
  { route: '/admin/settings/uploads', permission: 'platform.storage.manage' },
  { route: '/admin/settings/media', permission: 'platform.files.manage' },
  { route: '/admin/settings/events', permission: 'events.events.view' },
  { route: '/admin/settings/ai-api', permission: 'platform.advisory.request' },
  { route: '/admin/communications/settings', permission: 'platform.communications.view' },
  { route: '/admin/security/configuration', permission: 'platform.configuration.manage' },
  { route: '/admin/geography/settings', permission: 'platform.configuration.manage' },
];

test('Settings admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('Settings UI permissions accept Laravel catalog codes', () => {
  for (const { route, permission } of aliasCases) {
    const allowed = evaluateAccess(getAdminScreen(route)!, {
      authenticated: true,
      mfaVerified: true,
      permissions: [permission],
      scopes: ['assigned', 'global'],
    }, 'assigned');
    assert.equal(allowed.allowed, true, `${route} should accept ${permission}`);
  }
});

test('Settings sidebar uses live settings routes, not fixture home-church status', async () => {
  const source = await readFile(new URL('../components/admin-ui.tsx', import.meta.url), 'utf8');
  assert.match(source, /href: '\/admin\/settings\/home-church-rules'/);
  assert.match(source, /href: '\/admin\/settings\/church'/);
  assert.match(source, /href: '\/admin\/settings\/feature-flags'/);
  assert.match(source, /href: '\/admin\/settings\/maps'/);
  assert.doesNotMatch(source, /Home Church Rules',\s*href: '\/admin\/home-churches\/grace-home-church\/status'/);
});

test('Both admin shells render live platform settings panels', async () => {
  const adminUi = await readFile(new URL('../components/admin-ui.tsx', import.meta.url), 'utf8');
  const platformUi = await readFile(new URL('../components/platform-ui.tsx', import.meta.url), 'utf8');
  assert.match(adminUi, /PlatformSettingsScreen/);
  assert.match(platformUi, /export function PlatformSettingsScreen/);
  assert.match(platformUi, /BrandingSettingsPanel/);
  assert.match(platformUi, /isPlatformResourceMissing/);
});

test('Missing demo dataset API is treated as unavailable, not a page failure', () => {
  const missing = new AdminPlatformApiError(404, 'The requested resource was not found.', 'RESOURCE_NOT_FOUND');
  assert.equal(isPlatformResourceMissing(missing), true);
  const forbidden = new AdminPlatformApiError(403, 'Forbidden', 'FORBIDDEN');
  assert.equal(isPlatformResourceMissing(forbidden), false);
});
