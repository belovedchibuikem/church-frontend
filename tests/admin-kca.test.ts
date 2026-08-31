import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { kcaHrefForDestination, kcaIsActivatedStudent, kcaPrimaryCta } from '../lib/kca-access.ts';
import { getAdminScreen } from '../lib/admin-routes.ts';
import { evaluateAccess } from '../lib/access-control.ts';
import { isCanonicalAdminRoute } from '../lib/admin-navigation.ts';

const landings = [
  '/admin/kca',
  '/admin/kca/applications',
  '/admin/kca/review-queue',
  '/admin/kca/students',
  '/admin/kca/cohorts',
  '/admin/kca/years',
  '/admin/kca/mentors',
  '/admin/kca/lecturers',
  '/admin/kca/modules',
  '/admin/kca/lessons',
  '/admin/kca/certificates',
  '/admin/kca/alumni',
];

test('KCA admin landings are catalogued', () => {
  for (const route of landings) {
    assert.ok(getAdminScreen(route), route);
    assert.ok(isCanonicalAdminRoute(route), route);
  }
});

test('KCA application Edit and View open the decision workflow', async () => {
  const shell = await readFile(new URL('../components/admin-interaction-shell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /action === 'view' \|\| action === 'edit'/);
  assert.match(shell, /\/admin\/kca\/applications\/\$\{recordId\}\/decision/);
});

test('KCA application ULID decision route resolves', () => {
  const id = '01JABCDEFGHJKMNPQRSTVWXYZ0';
  assert.equal(getAdminScreen(`/admin/kca/applications/${id}`)?.kind, 'detail');
  assert.ok(getAdminScreen(`/admin/kca/applications/${id}/decision`));
});

test('KCA UI permissions accept Laravel application view', () => {
  const screen = getAdminScreen('/admin/kca/applications')!;
  const allowed = evaluateAccess(screen, {
    authenticated: true,
    mfaVerified: true,
    permissions: ['kca.applications.view'],
    scopes: ['global'],
  });
  assert.equal(allowed.allowed, true);
});

test('member KCA destinations map to authoritative routes', () => {
  assert.equal(kcaHrefForDestination('overview'), '/kca');
  assert.equal(kcaHrefForDestination('resume_application'), '/kca/apply/church');
  assert.equal(kcaHrefForDestination('admission_progress'), '/kca/apply/status');
  assert.equal(kcaHrefForDestination('information_required'), '/kca/apply/status');
  assert.equal(kcaHrefForDestination('orientation'), '/account/kca/orientation');
  assert.equal(kcaHrefForDestination('admission_letter'), '/kca/admission-letter');
  assert.equal(kcaHrefForDestination('student_dashboard'), '/account/kca');
  assert.equal(kcaHrefForDestination('deferred'), '/kca/apply/status');
  assert.equal(kcaHrefForDestination('not_admitted'), '/kca/apply/status');
  assert.equal(kcaHrefForDestination('restricted'), '/kca/apply/status');
  assert.equal(kcaIsActivatedStudent('student_dashboard'), true);
  assert.equal(kcaIsActivatedStudent('admission_progress'), false);
  assert.equal(kcaPrimaryCta('overview').href, '/kca/enrol');
});
