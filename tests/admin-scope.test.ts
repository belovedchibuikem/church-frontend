import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeAdminScopeToken } from '../lib/admin-scope.ts';

test('sanitizeAdminScopeToken keeps real scope tokens and drops fixture labels', () => {
  assert.equal(sanitizeAdminScopeToken('global'), 'global');
  assert.equal(sanitizeAdminScopeToken('assigned'), 'assigned');
  assert.equal(sanitizeAdminScopeToken('self'), 'self');
  assert.equal(sanitizeAdminScopeToken('country:01JCOUNTRY00000000000000001'), 'country:01JCOUNTRY00000000000000001');
  assert.equal(sanitizeAdminScopeToken('mission field'), undefined);
  assert.equal(sanitizeAdminScopeToken('mission+field'), undefined);
  assert.equal(sanitizeAdminScopeToken('mission-field'), undefined);
  assert.equal(sanitizeAdminScopeToken('Mission Field'), undefined);
});
