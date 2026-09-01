import assert from 'node:assert/strict';
import test from 'node:test';
import { findSiteRoute, isMemberNavActive, memberNavigation, siteRoutes } from '../lib/site-routes.ts';

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
  for (const path of [
    '/',
    '/church',
    '/mission',
    '/kca',
    '/kca/gate',
    '/press',
    '/press/devotionals',
    '/events',
    '/give',
    '/online-church',
    '/bible',
    '/bible/plans',
    '/login',
    '/register',
    '/account',
    '/account/kca',
    '/account/calendar',
    '/account/events',
  ]) {
    assert.ok(findSiteRoute(path), `Missing ${path}`);
  }
});

test('member navigation keeps unique hrefs and nested-route active matching', () => {
  const hrefs = memberNavigation.map(([href]) => href);
  assert.equal(new Set(hrefs).size, hrefs.length);
  assert.equal(isMemberNavActive('/account', '/account'), true);
  assert.equal(isMemberNavActive('/account/church', '/account'), false);
  assert.equal(isMemberNavActive('/account/kca/modules', '/account/kca'), true);
  assert.equal(isMemberNavActive('/account/giving/recurring', '/account/giving'), true);
  assert.equal(isMemberNavActive(null, '/account/kca'), false);
  assert.equal(isMemberNavActive(undefined, '/account'), false);
});

test('events and KCA flows expose register, ticket, modules and mentor routes', () => {
  for (const path of [
    '/events/youth-summit-2025',
    '/events/youth-summit-2025/register',
    '/events/youth-summit-2025/ticket',
    '/account/kca/modules',
    '/account/kca/assignments',
    '/account/kca/mentor',
    '/account/kca/attendance',
    '/kca/apply/church',
    '/kca/admission-letter',
  ]) {
    assert.ok(findSiteRoute(path), `Missing ${path}`);
  }
});

test('live KCA module and assignment links resolve as protected member pages', () => {
  const module = findSiteRoute('/account/kca/modules/01J8KCA1234567890ABCDEFGHJ');
  const assignment = findSiteRoute('/account/kca/assignments/01J8KCA1234567890ABCDEFGHJ');

  assert.equal(module?.surface, 'member');
  assert.equal(module?.kind, 'detail');
  assert.equal(assignment?.surface, 'member');
  assert.equal(assignment?.kind, 'detail');
});

test('bible chapter paths resolve as a public reader', () => {
  const chapter = findSiteRoute('/bible/john/3');
  assert.equal(chapter?.kind, 'bible');
  assert.equal(chapter?.surface, 'public');
  assert.equal(findSiteRoute('/bible')?.kind, 'bible');
});

test('member community, mission, and journey stage routes match mobile member surfaces', () => {
  for (const path of [
    '/account/groups',
    '/account/announcements',
    '/account/documents',
    '/account/mission/invitations',
    '/account/mission/support-requests',
    '/account/journey/discover',
    '/account/journey/join-church',
    '/account/journey/member',
    '/account/journey/grow',
    '/account/journey/serve',
    '/account/journey/win-souls',
    '/account/journey/become-kca',
    '/account/journey/home-church',
    '/account/journey/multiply',
  ]) {
    const route = findSiteRoute(path);
    assert.ok(route, `Missing ${path}`);
    assert.equal(route?.surface, 'member');
  }

  const group = findSiteRoute('/account/groups/01J8GRP1234567890ABCDEFGHJ');
  assert.equal(group?.surface, 'member');
  assert.equal(group?.kind, 'detail');
});

test('member auth registration and verification routes are available', () => {
  for (const path of [
    '/login',
    '/register',
    '/register/personal',
    '/register/contact',
    '/register/security',
    '/register/about',
    '/register/review',
    '/verify-email',
    '/verify-phone',
    '/otp',
    '/forgot-password',
    '/reset-password',
    '/mfa/setup',
    '/account-recovery',
    '/onboarding/language',
    '/onboarding/location',
    '/onboarding/profile',
    '/onboarding/role',
  ]) {
    const route = findSiteRoute(path);
    assert.ok(route, `Missing ${path}`);
    assert.equal(route?.surface, 'auth');
  }
});
