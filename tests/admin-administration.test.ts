import assert from 'node:assert/strict';
import test from 'node:test';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';
import { adminTabSlug, resolveAdminScreenTab } from '../lib/use-admin-screen-tab.ts';

const landings = [
  '/admin',
  '/admin/scope',
  '/admin/command',
  '/admin/approvals',
  '/admin/alerts',
  '/admin/alerts/rules',
  '/admin/notifications',
  '/admin/activity',
  '/admin/audit',
  '/admin/tasks',
  '/admin/kpi',
  '/admin/quick-actions',
  '/admin/profile',
  '/admin/users',
  '/admin/users/create',
  '/admin/users/suspended',
  '/admin/roles',
  '/admin/roles/create',
  '/admin/permissions',
  '/admin/permissions/matrix',
  '/admin/access/scope-assignments',
  '/admin/access/user-role-assignment',
  '/admin/access/history',
  '/admin/access/impersonation',
];

test('administration landing pages are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('dynamic user and role routes resolve', () => {
  const user = getAdminScreen('/admin/users/01JABCDEFGHJKMNPQRSTVWXYZ0');
  assert.ok(user);
  assert.equal(user.batch, 'B');
  assert.deepEqual(user.tabs, ['Overview', 'Profile', 'Roles & Permissions', 'Activity', 'Giving', 'Churches', 'More']);
  const edit = getAdminScreen('/admin/users/01JABCDEFGHJKMNPQRSTVWXYZ0/edit');
  assert.ok(edit);
  const role = getAdminScreen('/admin/roles/01JABCDEFGHJKMNPQRSTVWXYZ0');
  assert.ok(role);
});

test('user detail tab slugs match URL query keys', () => {
  const tabs = ['Overview', 'Profile', 'Roles & Permissions', 'Activity', 'Giving', 'Churches', 'More'];
  assert.equal(adminTabSlug('Roles & Permissions'), 'roles-permissions');
  assert.equal(resolveAdminScreenTab(tabs, 'profile'), 'Profile');
  assert.equal(resolveAdminScreenTab(tabs, 'missing'), 'Overview');
});

test('administration UI permissions accept Laravel aliases', () => {
  const context = {
    authenticated: true,
    mfaVerified: true,
    permissions: ['identity.users.view', 'platform.search.query', 'reporting.alert_occurrences.view', 'security.audit.view', 'administration.work_items.view'],
    scopes: ['global'],
  };
  assert.equal(evaluateAccess(getAdminScreen('/admin/command')!, context).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/alerts')!, context).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/activity')!, context).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/tasks')!, context).allowed, true);
  assert.equal(evaluateAccess(getAdminScreen('/admin/users')!, context).allowed, true);
});

test('member cannot open administration users', () => {
  const denied = evaluateAccess(getAdminScreen('/admin/users')!, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['member.self.manage'],
    scopes: ['global'],
  });
  assert.equal(denied.allowed, false);
});
