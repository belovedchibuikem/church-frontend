import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { adminScreens } from '../lib/admin-routes.ts';
import { getAdminBreadcrumbs, getAdminParent, getDefaultChildRoute, getInteractionRouteMap, isCanonicalAdminRoute, normalizeInteractionLabel } from '../lib/admin-navigation.ts';
import { adminModules, getAdminModuleForRoute, isRestorableAdminRoute, moduleReturnStorageKey, sanitizeModuleReturn } from '../lib/admin-modules.ts';

test('every protected admin screen has a canonical breadcrumb chain', () => {
  for (const screen of adminScreens.filter((item) => !['login', 'mfa'].includes(item.kind))) {
    const breadcrumbs = getAdminBreadcrumbs(screen);
    assert.ok(breadcrumbs.length >= 1, `${screen.id} has no breadcrumb`);
    assert.equal(breadcrumbs.at(-1)?.route, screen.route, `${screen.id} breadcrumb does not end at its route`);
    assert.equal(breadcrumbs[0]?.route, '/admin', `${screen.id} breadcrumb does not start at Admin`);
    for (const item of breadcrumbs) assert.ok(isCanonicalAdminRoute(item.route), `${screen.id} breadcrumb points to ${item.route}`);
  }
});

test('parents and default list-to-detail destinations stay in the route catalog', () => {
  for (const screen of adminScreens) {
    const parent = getAdminParent(screen);
    if (parent) assert.ok(isCanonicalAdminRoute(parent.route), `${screen.id} has an invalid parent`);
    const child = getDefaultChildRoute(screen);
    if (child) assert.ok(isCanonicalAdminRoute(child), `${screen.id} has an invalid child destination`);
  }
});

test('all shared action destinations resolve to canonical admin routes', () => {
  for (const screen of adminScreens) {
    for (const [label, route] of Object.entries(getInteractionRouteMap(screen))) {
      assert.ok(isCanonicalAdminRoute(route), `${screen.id} action ${label} points to ${route}`);
    }
  }
});

test('interaction labels normalize consistently', () => {
  assert.equal(normalizeInteractionLabel('+ View Details →'), 'view details');
  assert.equal(normalizeInteractionLabel('  Mark all as read  '), 'mark all as read');
});

test('the shared shell replaces placeholder links and covers all rendered screens', async () => {
  const source = await readFile(new URL('../components/admin-ui.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /href=["']#["']/);
  assert.match(source, /AdminInteractionShell/);
});

test('every route resolves to an enterprise module with a canonical home', () => {
  const ids = new Set(adminModules.map((module) => module.id));
  assert.equal(ids.size, adminModules.length, 'module IDs must be unique');
  for (const adminModule of adminModules) assert.ok(isCanonicalAdminRoute(adminModule.homeRoute), `${adminModule.id} has invalid home ${adminModule.homeRoute}`);
  for (const screen of adminScreens) assert.ok(ids.has(getAdminModuleForRoute(screen.route).id), `${screen.id} has no module`);
});

test('module return locations preserve safe view state and reject transient or external paths', () => {
  assert.equal(sanitizeModuleReturn('finance', '/admin/finance/disputes?page=3&status=open&q=secret'), '/admin/finance/disputes?page=3&status=open');
  assert.equal(sanitizeModuleReturn('finance', '/admin/finance/refunds'), '/admin/finance/refunds');
  assert.equal(sanitizeModuleReturn('finance', '/admin/press/publications'), undefined);
  assert.equal(sanitizeModuleReturn('finance', 'https://evil.example/admin/finance'), undefined);
  assert.equal(isRestorableAdminRoute('/admin/security/safeguarding/cases/case-0032'), false);
  assert.equal(moduleReturnStorageKey('press', 'global'), 'fhc-admin-return:press:global');
});

test('specific action mappings cannot be overwritten by unrelated descendant forms', () => {
  const reviewQueue = adminScreens.find((screen) => screen.id === 'G-01');
  const exportApplications = adminScreens.find((screen) => screen.id === 'G-02');
  const addChurch = adminScreens.find((screen) => screen.id === 'E-02');
  assert.ok(reviewQueue && exportApplications && addChurch);
  assert.equal(getInteractionRouteMap(reviewQueue)['view review queue'], '/admin/kca/review-queue');
  assert.equal(getInteractionRouteMap(exportApplications).export, undefined);
  assert.equal(getInteractionRouteMap(addChurch)['add church'], undefined);
  assert.equal(getInteractionRouteMap(reviewQueue)['open admin profile'], '/admin/profile');
});

test('multi-screen workflows advance to the next canonical screen', () => {
  const expected: Record<string, string> = {
    'D-03': '/admin/home-churches/applications/grace-home-church/review',
    'D-04': '/admin/home-churches/applications/grace-home-church/decision',
    'G-04': '/admin/kca/applications/samuel-david/church-information',
    'G-10': '/admin/kca/review-queue',
    'I-04': '/admin/mission/crusades/lagos-mega-crusade/planning',
    'J-08': '/admin/press/manuscripts/power-of-covenant/theological-review',
    'J-13': '/admin/press/publications',
    'M-03': '/admin/communications/audiences/create',
  };
  for (const [id, destination] of Object.entries(expected)) {
    const screen = adminScreens.find((item) => item.id === id);
    assert.ok(screen?.action, `${id} has no primary action`);
    assert.equal(getInteractionRouteMap(screen)[normalizeInteractionLabel(screen.action)], destination, `${id} does not advance correctly`);
  }
});
