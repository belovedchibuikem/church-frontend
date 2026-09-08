import assert from 'node:assert/strict';
import test from 'node:test';
import { findSiteRoute, isKcaMemberWorkspacePath, isMemberNavActive, memberNavigation, siteRoutes } from '../lib/site-routes.ts';

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

test('legal and policy pages are public landing routes', () => {
  for (const path of [
    '/privacy',
    '/terms',
    '/cookies',
    '/safeguarding',
    '/community-guidelines',
    '/giving-policy',
    '/beliefs',
  ]) {
    const route = findSiteRoute(path);
    assert.ok(route, `Missing ${path}`);
    assert.equal(route?.surface, 'public');
    assert.equal(route?.kind, 'landing');
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
    '/press/publications',
    '/press/devotionals',
    '/events',
    '/give',
    '/online-church',
    '/bible',
    '/bible/plans',
    '/privacy',
    '/terms',
    '/cookies',
    '/safeguarding',
    '/community-guidelines',
    '/giving-policy',
    '/beliefs',
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

test('live KCA entity links resolve as protected member workspace pages', () => {
  const id = '01J8KCA1234567890ABCDEFGHJ';
  const module = findSiteRoute(`/account/kca/modules/${id}`);
  const lesson = findSiteRoute(`/account/kca/lessons/${id}`);
  const chapter = findSiteRoute(`/account/kca/chapters/${id}`);
  const assignment = findSiteRoute(`/account/kca/assignments/${id}`);
  const orientation = findSiteRoute('/account/kca/orientation/vision');

  for (const route of [module, lesson, chapter, assignment, orientation]) {
    assert.equal(route?.surface, 'member');
    assert.equal(route?.kind, 'dashboard');
    assert.equal(route?.section, 'KCA');
    assert.equal(isKcaMemberWorkspacePath(route!.path), true);
  }
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

test('KCA landing title is stable and testimonies have member CRUD routes', () => {
  assert.equal(findSiteRoute('/kca')?.title, 'Kingdom Citizens Academy');
  assert.equal(findSiteRoute('/kca/why')?.path, '/kca/why');
  assert.equal(findSiteRoute('/press/publications')?.path, '/press/publications');
  assert.equal(findSiteRoute('/account/testimonies')?.surface, 'member');
  assert.equal(findSiteRoute('/account/testimonies/new')?.kind, 'form');
  const edit = findSiteRoute('/account/testimonies/01J8TST1234567890ABCDEFGHJ');
  assert.equal(edit?.surface, 'member');
  assert.equal(edit?.kind, 'form');
  assert.ok(memberNavigation.some(([href]) => href === '/account/testimonies'));
});
