import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess } from '../lib/access-control.ts';
import { dashboardMetricLinks, dashboardQuickActions } from '../lib/admin-dashboard-nav.ts';
import { getInteractionRouteMap, isCanonicalAdminRoute, normalizeInteractionLabel } from '../lib/admin-navigation.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { resolveEntityKey } from '../lib/admin-form-schemas.ts';

const landings = [
  '/admin/security',
  '/admin/security/audit-logs',
  '/admin/security/login-history',
  '/admin/security/access-decisions',
  '/admin/security/alerts',
  '/admin/security/data-classification',
  '/admin/security/safeguarding',
  '/admin/security/safeguarding/cases',
  '/admin/security/child-profiles',
  '/admin/security/guardian-consent',
  '/admin/security/communication-restrictions',
  '/admin/security/pastoral-records',
  '/admin/security/restricted-access',
  '/admin/security/data-export-requests',
  '/admin/security/data-deletion-requests',
  '/admin/security/privacy-requests',
  '/admin/security/configuration',
];

const aliasCases: Array<{ route: string; permission: string }> = [
  { route: '/admin/security', permission: 'security.audit.view' },
  { route: '/admin/security/login-history', permission: 'identity.security.sessions.view' },
  { route: '/admin/security/access-decisions', permission: 'security.access_decisions.view' },
  { route: '/admin/security/alerts', permission: 'reporting.alert_occurrences.view' },
  { route: '/admin/security/safeguarding/cases', permission: 'safeguarding.incidents.report' },
  { route: '/admin/security/guardian-consent', permission: 'safeguarding.guardians.register' },
  { route: '/admin/security/privacy-requests', permission: 'privacy.data_subject_requests.view' },
  { route: '/admin/security/configuration', permission: 'platform.configuration.manage' },
];

test('Security admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('Security UI permissions accept Laravel catalog codes', () => {
  for (const { route, permission } of aliasCases) {
    const allowed = evaluateAccess(getAdminScreen(route)!, {
      authenticated: true,
      mfaVerified: true,
      permissions: [permission],
      scopes: ['assigned'],
    }, 'assigned');
    assert.equal(allowed.allowed, true, `${route} should accept ${permission}`);
  }
});

test('Security dashboard Create Record and related actions resolve to live routes', () => {
  const screen = getAdminScreen('/admin/security')!;
  const map = getInteractionRouteMap(screen);
  assert.equal(map[normalizeInteractionLabel('Create Record')], undefined);
  assert.equal(map[normalizeInteractionLabel('Open Queue')], '/admin/security/alerts');
  assert.equal(map[normalizeInteractionLabel('Generate Report')], '/admin/security/audit-logs');
  assert.equal(map[normalizeInteractionLabel('View Analytics')], '/admin/security/login-history');
  assert.equal(resolveEntityKey('/admin/security', 'O-01'), 'safeguarding_incident');
  assert.equal(resolveEntityKey('/admin/security/safeguarding/cases', 'O-09'), 'safeguarding_incident');
  assert.equal(resolveEntityKey('/admin/security/child-profiles', 'O-11'), 'child_profile');
  assert.equal(resolveEntityKey('/admin/security/guardian-consent', 'O-12'), 'guardian_relationship');
  assert.equal(resolveEntityKey('/admin/security/communication-restrictions', 'O-13'), 'child_profile');
  assert.equal(resolveEntityKey('/admin/security/privacy-requests', 'O-18'), 'privacy_request');
});

test('Audit detail and safeguarding case ULID routes resolve live templates', () => {
  const audit = getAdminScreen('/admin/security/audit-logs/01ARZ3NDEKTSV4RRFFQ69G5FAV');
  assert.ok(audit);
  assert.equal(audit?.id, 'O-03');
  assert.equal(audit?.kind, 'detail');
  const incident = getAdminScreen('/admin/security/safeguarding/cases/01ARZ3NDEKTSV4RRFFQ69G5FAV');
  assert.ok(incident);
  assert.equal(incident?.id, 'O-10');
});

test('Security quick actions and metric links stay on canonical routes', () => {
  for (const screenId of ['O-01', 'O-08']) {
    for (const action of dashboardQuickActions[screenId] ?? []) {
      assert.ok(isCanonicalAdminRoute(action.href), `${screenId} ${action.label} -> ${action.href}`);
    }
    for (const href of Object.values(dashboardMetricLinks[screenId] ?? {})) {
      assert.ok(isCanonicalAdminRoute(href), `${screenId} metric -> ${href}`);
    }
  }
});
