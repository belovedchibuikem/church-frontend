import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess } from '../lib/access-control.ts';
import { dashboardMetricLinks, dashboardQuickActions } from '../lib/admin-dashboard-nav.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const landings = [
  '/admin/communications',
  '/admin/communications/notifications',
  '/admin/communications/broadcasts',
  '/admin/communications/audiences',
  '/admin/communications/broadcasts/create',
  '/admin/communications/audiences/create',
  '/admin/communications/templates',
  '/admin/communications/delivery-queue',
  '/admin/communications/delivery-report',
  '/admin/communications/failed',
  '/admin/communications/settings',
];

test('Communications admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('Communications UI permissions accept Laravel catalog codes', () => {
  const context = {
    authenticated: true,
    mfaVerified: true,
    permissions: ['communications.broadcasts.view'],
    scopes: ['global'],
  };
  assert.equal(evaluateAccess(getAdminScreen('/admin/communications/broadcasts')!, context).allowed, true);
  assert.equal(
    evaluateAccess(getAdminScreen('/admin/communications/email/create')!, {
      ...context,
      permissions: ['communications.broadcasts.prepare'],
    }).allowed,
    true,
  );
  assert.equal(
    evaluateAccess(getAdminScreen('/admin/communications')!, {
      ...context,
      permissions: ['communications.templates.view'],
    }).allowed,
    true,
  );
});

test('Communications dashboard quick actions and metric links stay on canonical routes', () => {
  for (const action of dashboardQuickActions['M-01'] ?? []) {
    assert.ok(isCanonicalAdminRoute(action.href), action.href);
  }
  for (const href of Object.values(dashboardMetricLinks['M-01'] ?? {})) {
    assert.ok(isCanonicalAdminRoute(href), href);
  }
});
