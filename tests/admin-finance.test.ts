import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAccess } from '../lib/access-control.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const landings = [
  '/admin/finance',
  '/admin/finance/transactions',
  '/admin/finance/tithes',
  '/admin/finance/offerings',
  '/admin/finance/reconciliation',
  '/admin/finance/receipts',
  '/admin/finance/refunds',
  '/admin/finance/disputes',
  '/admin/finance/providers',
  '/admin/finance/reports',
  '/admin/finance/alerts',
];

test('Finance admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('Finance UI permissions accept Laravel payment catalog codes', () => {
  const context = {
    authenticated: true,
    mfaVerified: true,
    permissions: ['finance.payment_transactions.view'],
    scopes: ['global'],
  };
  assert.equal(evaluateAccess(getAdminScreen('/admin/finance/transactions')!, context).allowed, true);
  assert.equal(
    evaluateAccess(getAdminScreen('/admin/finance/tithes')!, {
      ...context,
      permissions: ['finance.payment_intents.view'],
    }).allowed,
    true,
  );
  assert.equal(
    evaluateAccess(getAdminScreen('/admin/finance/providers')!, {
      ...context,
      permissions: ['platform.payments.view'],
    }).allowed,
    true,
  );
});
