import assert from 'node:assert/strict';
import test from 'node:test';
import { findSiteRoute, siteRoutes } from '../lib/site-routes.ts';

test('public and member reference catalogue has unique, resolvable routes', () => {
  assert.ok(siteRoutes.length >= 110);
  assert.equal(new Set(siteRoutes.map((route) => route.path)).size, siteRoutes.length);
  for (const route of siteRoutes) assert.equal(findSiteRoute(route.path), route);
});

test('member routes are explicitly classified and public routes are not protected', () => {
  for (const route of siteRoutes) {
    if (route.path.startsWith('/account/') || route.path === '/account') assert.equal(route.surface, 'member');
    if (route.surface === 'public') assert.ok(!route.path.startsWith('/account'));
  }
});

test('every major public experience has a canonical entry route', () => {
  for (const path of ['/', '/church', '/mission', '/kca', '/press', '/events', '/give', '/online-church', '/login', '/account']) {
    assert.ok(findSiteRoute(path), `Missing ${path}`);
  }
});
