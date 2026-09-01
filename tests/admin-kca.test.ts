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
  '/admin/kca/students/register',
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

test('KCA years and assessments use dedicated form schemas', async () => {
  const { resolveEntityKey, fieldsForEntity } = await import('../lib/admin-form-schemas.ts');
  assert.equal(resolveEntityKey('/admin/kca/years', 'H-04'), 'kca_year');
  assert.equal(resolveEntityKey('/admin/kca/assessments/final', 'H-17'), 'kca_assessment');
  assert.ok(fieldsForEntity('kca_year').some((field) => field.name === 'code'));
  assert.ok(fieldsForEntity('kca_assessment').some((field) => field.name === 'kca_enrollment_id'));
  const years = getAdminScreen('/admin/kca/years')!;
  assert.equal(years.action, '+ Create Year');
});

test('create cohort is not treated as a preview overlay', async () => {
  const shell = await readFile(new URL('../components/admin-interaction-shell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /view\|open\|details\|website/);
  assert.doesNotMatch(shell, /view\|open\|details\|cohort\|website/);
});

test('KCA module builder preserves basic info across wizard steps', async () => {
  const {
    captureKcaModuleFormValues,
    kcaModuleMutationPayload,
    validateKcaModuleFormValues,
  } = await import('../lib/kca-module-builder.ts');

  const container = {
    querySelectorAll(selector: string) {
      if (!selector.includes('input')) return [];
      return [
        { name: 'title', type: 'text', value: 'Identity in Christ' },
        { name: 'code', type: 'text', value: 'Y1-M01' },
        { name: 'sequence', type: 'number', value: '1' },
        { name: 'duration_days', type: 'number', value: '7' },
      ];
    },
  } as unknown as ParentNode;

  const captured = captureKcaModuleFormValues(container, {});
  assert.equal(validateKcaModuleFormValues(captured), null);
  assert.deepEqual(kcaModuleMutationPayload(captured), {
    code: 'Y1-M01',
    title: 'Identity in Christ',
    sequence: '1',
    duration_days: '7',
  });

  const merged = captureKcaModuleFormValues({ querySelectorAll: () => [] } as unknown as ParentNode, captured);
  assert.equal(validateKcaModuleFormValues(merged), null);

  const source = await readFile(new URL('../components/kca-ui.tsx', import.meta.url), 'utf8');
  assert.match(source, /moduleDraftRef/);
  assert.match(source, /data-kca-module-builder="true"/);
  assert.match(source, /label: 'Create module'/);
});

test('KCA modules and lessons screens support editing saved lessons', async () => {
  const source = await readFile(new URL('../components/kca-ui.tsx', import.meta.url), 'utf8');
  assert.match(source, /function KcaLessonForm/);
  assert.match(source, /function KcaModuleLessonsManager/);
  assert.match(source, /function KcaLessonsPanel/);
  assert.match(source, /label: isEdit \? 'Save lesson changes' : 'Add lesson'/);
  assert.match(source, /Manage lessons/);
});

test('KCA student registration includes login account fields', async () => {
  const { kcaRegistrationSteps, flattenKcaRegistrationPayload } = await import('../lib/kca-registration-steps.ts');
  const churchStep = kcaRegistrationSteps[0]!;
  assert.ok(churchStep.fields.some((field) => field.name === 'create_login'));
  assert.ok(churchStep.fields.some((field) => field.name === 'password'));
  const enrollmentStep = kcaRegistrationSteps.at(-1)!;
  assert.equal(enrollmentStep.id, 'enrollment');
  assert.ok(enrollmentStep.fields.some((field) => field.name === 'admit_and_enroll'));
  const payload = flattenKcaRegistrationPayload({
    given_name: 'Ada',
    family_name: 'Okafor',
    email: 'ada@example.org',
    create_login: 'true',
    password: 'StudentPass123',
    password_confirmation: 'StudentPass123',
    why: 'Ministry growth',
    admit_and_enroll: 'true',
    cohort_id: '01JABCDEFGHJKMNPQRSTVWXYZ0',
    registration_number: 'KCA-2026-0001',
    starts_on: '2026-09-01',
  });
  assert.equal(payload.create_login, true);
  assert.equal(payload.admit_and_enroll, true);
  assert.equal(payload.cohort_id, '01JABCDEFGHJKMNPQRSTVWXYZ0');
  assert.equal(payload.password, 'StudentPass123');
  assert.equal(payload.email, 'ada@example.org');
  assert.equal(payload.application_data.why, 'Ministry growth');
  assert.equal(payload.application_data.password, undefined);
});
