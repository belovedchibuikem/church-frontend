import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { evaluateAccess } from '../lib/access-control.ts';
import { dashboardMetricLinks, dashboardQuickActions } from '../lib/admin-dashboard-nav.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';

const landings = [
  '/admin/reports',
  '/admin/reports/churches',
  '/admin/reports/home-churches',
  '/admin/reports/membership',
  '/admin/reports/first-timers',
  '/admin/reports/evangelism',
  '/admin/reports/missions',
  '/admin/reports/kca',
  '/admin/reports/mentors',
  '/admin/reports/press',
  '/admin/reports/finance',
  '/admin/reports/countries',
  '/admin/reports/territories',
  '/admin/reports/trends',
  '/admin/reports/pastoral-ai',
  '/admin/reports/press-ai',
];

const expectedModules: Record<string, string> = {
  'N-01': 'reports',
  'N-02': 'church',
  'N-03': 'home-churches',
  'N-04': 'people',
  'N-05': 'church',
  'N-06': 'church',
  'N-07': 'mission',
  'N-08': 'kca',
  'N-09': 'kca',
  'N-10': 'press',
  'N-11': 'finance',
  'N-12': 'geography',
  'N-13': 'geography',
  'N-14': 'reports',
  'N-15': 'reports',
  'N-16': 'press',
};

const aliasCases: Array<{ route: string; permission: string }> = [
  { route: '/admin/reports', permission: 'reporting.alert_rules.view' },
  { route: '/admin/reports/churches', permission: 'church.churches.view' },
  { route: '/admin/reports/home-churches', permission: 'church.home_churches.view' },
  { route: '/admin/reports/membership', permission: 'church.churches.view' },
  { route: '/admin/reports/first-timers', permission: 'church.first_timers.view' },
  { route: '/admin/reports/missions', permission: 'mission.crusades.view' },
  { route: '/admin/reports/kca', permission: 'kca.enrollments.view' },
  { route: '/admin/reports/press', permission: 'press.publications.view' },
  { route: '/admin/reports/finance', permission: 'finance.payment_intents.view' },
  { route: '/admin/reports/countries', permission: 'organization.countries.view' },
  { route: '/admin/reports/pastoral-ai', permission: 'platform.advisory.request' },
  { route: '/admin/reports/press-ai', permission: 'press.publications.view' },
];

test('Reports admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('Reports screens map onto live dashboard modules, with membership on people', async () => {
  const apiSource = await readFile(new URL('../lib/admin-dashboard-api.ts', import.meta.url), 'utf8');
  for (const route of landings) {
    const screen = getAdminScreen(route)!;
    const module = expectedModules[screen.id];
    assert.ok(module, `${screen.id} missing expected API module`);
    assert.match(apiSource, new RegExp(`'${screen.id}': '${module}'`));
  }
});

test('Reports UI permissions accept Laravel catalog codes', () => {
  for (const { route, permission } of aliasCases) {
    const allowed = evaluateAccess(getAdminScreen(route)!, {
      authenticated: true,
      mfaVerified: true,
      permissions: [permission],
      scopes: ['global'],
    });
    assert.equal(allowed.allowed, true, `${route} should accept ${permission}`);
  }

  const denied = evaluateAccess(getAdminScreen('/admin/reports/finance')!, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view'],
    scopes: ['global'],
  });
  assert.equal(denied.allowed, false);
});

test('Reports quick actions and metric links stay on canonical routes', () => {
  for (const screenId of Object.keys(expectedModules)) {
    for (const action of dashboardQuickActions[screenId] ?? []) {
      assert.ok(isCanonicalAdminRoute(action.href), `${screenId} action ${action.label} -> ${action.href}`);
    }
    for (const href of Object.values(dashboardMetricLinks[screenId] ?? {})) {
      assert.ok(isCanonicalAdminRoute(href), `${screenId} metric -> ${href}`);
    }
  }
});
