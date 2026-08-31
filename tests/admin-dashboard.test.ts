import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { dashboardNavItems, dashboardQuickActions } from '../lib/admin-dashboard-nav.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';
import { evaluateAccess } from '../lib/access-control.ts';

const expectedModules: Record<string, string> = {
  'A-03': 'global',
  'C-01': 'geography',
  'D-01': 'home-churches',
  'E-01': 'church',
  'G-01': 'kca',
  'I-01': 'mission',
  'J-01': 'press',
  'K-01': 'finance',
  'M-01': 'communications',
  'N-01': 'reports',
  'O-01': 'security',
};

test('every Dashboards nav landing page is catalogued and mapped to an API module', async () => {
  const apiSource = await readFile(new URL('../lib/admin-dashboard-api.ts', import.meta.url), 'utf8');
  assert.equal(dashboardNavItems.length, 11);
  for (const item of dashboardNavItems) {
    const screen = getAdminScreen(item.href);
    assert.ok(screen, `${item.href} is not a catalog screen`);
    const module = expectedModules[screen.id];
    assert.ok(module, `${screen.id} missing expected API module`);
    assert.match(apiSource, new RegExp(`'${screen.id}': '${module}'`));
  }
});

test('dashboard quick actions resolve to canonical admin routes', () => {
  for (const [screenId, actions] of Object.entries(dashboardQuickActions)) {
    assert.ok(actions.length > 0, `${screenId} has no quick actions`);
    for (const action of actions) {
      assert.ok(isCanonicalAdminRoute(action.href), `${screenId} action ${action.label} -> ${action.href}`);
    }
  }
});

test('dashboard UI permissions accept Laravel capability aliases', () => {
  const churchDashboard = getAdminScreen('/admin/church/dashboard')!;
  const allowed = evaluateAccess(churchDashboard, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['church.churches.view'],
    scopes: ['church:abc'],
  }, 'church:abc');
  assert.equal(allowed.allowed, true);

  const denied = evaluateAccess(churchDashboard, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view'],
    scopes: ['church:abc'],
  }, 'church:abc');
  assert.equal(denied.allowed, false);
  if (!denied.allowed) assert.equal(denied.reason, 'permission-denied');
});

test('unauthenticated dashboard access is denied as unauthenticated, not forbidden', () => {
  const screen = getAdminScreen('/admin')!;
  const decision = evaluateAccess(screen, {
    authenticated: false,
    mfaVerified: false,
    permissions: [],
    scopes: [],
  });
  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.reason, 'unauthenticated');
});
