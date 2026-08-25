import assert from 'node:assert/strict';
import test from 'node:test';
import { adminScreens } from '../lib/admin-routes.ts';
import { localeDirection, supportedLocales } from '../lib/i18n.ts';

test('the nine approved contact sheets map to 153 unique reference screens', () => {
  assert.equal(adminScreens.length, 153);
  assert.equal(new Set(adminScreens.map((screen) => screen.route)).size, 153);
  for (const batch of ['A', 'B', 'C']) assert.equal(adminScreens.filter((screen) => screen.batch === batch).length, 16);
  assert.equal(adminScreens.filter((screen) => screen.batch === 'D').length, 14);
  for (const batch of ['E', 'F']) assert.equal(adminScreens.filter((screen) => screen.batch === batch).length, 16);
  assert.equal(adminScreens.filter((screen) => screen.batch === 'G').length, 18);
  assert.equal(adminScreens.filter((screen) => screen.batch === 'H').length, 20);
  assert.equal(adminScreens.filter((screen) => screen.batch === 'I').length, 21);

  assert.ok(adminScreens.some((screen) => screen.batch === 'G' && screen.route === '/admin/kca'));
  assert.ok(adminScreens.some((screen) => screen.batch === 'H' && screen.route === '/admin/kca/students'));
  assert.ok(adminScreens.some((screen) => screen.batch === 'I' && screen.route === '/admin/mission'));
  assert.ok(!adminScreens.some((screen) => screen.route === '/admin/screens'));
});

test('every route has traceable authorization metadata', () => {
  for (const screen of adminScreens) {
    assert.match(screen.id, /^[A-I]-\d{2}$/);
    assert.ok(screen.route.startsWith('/admin'));
    assert.ok(screen.permission.length > 0);
    assert.ok(['global', 'assigned', 'self'].includes(screen.scope));
  }
});

test('only the approved login, MFA and explicit forbidden reference are public', () => {
  const publicRoutes = adminScreens.filter((screen) => screen.permission === 'public').map((screen) => screen.route);
  assert.deepEqual(publicRoutes, ['/admin/login', '/admin/mfa', '/admin/forbidden']);
});

test('localization architecture includes all required locales and Arabic RTL', () => {
  assert.deepEqual(supportedLocales, ['en', 'yo', 'ig', 'ha', 'fr', 'ar', 'zh', 'sw']);
  assert.equal(localeDirection('ar'), 'rtl');
  assert.equal(localeDirection('en'), 'ltr');
});
