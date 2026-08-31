import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { afterEach, before, test } from 'node:test';
import {
  executeAdminAction,
  UnregisteredAdminActionError,
  UNREGISTERED_ADMIN_ACTION_MESSAGE,
} from '../lib/admin-mutation-dispatcher.ts';

process.env.FHC_LARAVEL_API_URL ??= 'http://example.test/api/v1';
process.env.NEXT_PUBLIC_FHC_API_URL ??= 'http://example.test/api/v1';

test('admin sign-in submits the login form instead of opening the interaction drawer', async () => {
  const ui = await readFile(new URL('../components/admin-ui.tsx', import.meta.url), 'utf8');
  const shell = await readFile(new URL('../components/admin-interaction-shell.tsx', import.meta.url), 'utf8');
  assert.match(ui, /if\(screen\.kind==='login'\|\|screen\.kind==='mfa'\) return <AuthView/);
  assert.match(ui, /loginBrowserUser/);
  assert.match(ui, /hasAdministratorCapabilities/);
  assert.match(shell, /screenKind === 'login' \|\| screenKind === 'mfa'/);
  assert.match(shell, /button\.type === 'submit'/);
  assert.match(shell, /branding-settings/);
});

test('admin shell submits Laravel mutations instead of faking success', async () => {
  const shell = await readFile(new URL('../components/admin-interaction-shell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /executeAdminAction/);
  assert.match(shell, /UNREGISTERED_ADMIN_ACTION_MESSAGE/);
  assert.match(shell, /onSubmit=\{executeMutation\}/);
  assert.doesNotMatch(shell, /saveLocalDraft/);
  assert.doesNotMatch(shell, /No server action was simulated/);
});

test('action surface reports submit errors and no longer saves local drafts as success', async () => {
  const source = await readFile(new URL('../components/admin-action-surface.tsx', import.meta.url), 'utf8');
  assert.match(source, /onSubmit:/);
  assert.match(source, /formatAdminMutationError/);
  assert.doesNotMatch(source, /onDraft/);
  assert.doesNotMatch(source, /Save local draft/);
});

test('dispatcher maps to Laravel admin.php operations and refuses unmapped actions', async () => {
  const source = await readFile(new URL('../lib/admin-mutation-dispatcher.ts', import.meta.url), 'utf8');
  assert.match(source, /createChurch/);
  assert.match(source, /transitionHomeChurchApplication/);
  assert.match(source, /completeFollowUpTask/);
  assert.match(source, /registerFirstTimer/);
  assert.match(source, /captureSoul/);
  assert.match(source, /assignSoulMentor/);
  assert.match(source, /recordSoulFollowUp/);
  assert.match(source, /completeSoulFollowUp/);
  assert.match(source, /createCountry/);
  assert.match(source, /suspendAdminUser/);
  assert.match(source, /upsertConfiguration/);
  assert.match(source, /admin\/kca\/years/);
  assert.match(source, /admin\/kca\/modules/);
  assert.match(source, /admin\/press\/publications/);
  assert.match(source, /admin\/events/);
  assert.match(source, /admin\/communications\/templates/);
  assert.match(source, /admin\/reporting\/alert-rules/);
  assert.match(source, /admin\/privacy\/data-subject-requests/);
  assert.match(source, /admin\/safeguarding\/incidents/);
  assert.match(source, /admin\/platform\/search\/queries/);
  assert.match(source, /admin\/platform\/advisory\/requests/);
  assert.match(source, /admin\/finance\/payment-intents/);
  assert.match(source, /Idempotency-Key/);
  assert.match(source, /No Laravel operation is registered for this action/);
  assert.match(source, /throw new UnregisteredAdminActionError/);
  assert.doesNotMatch(source, /admin\/catalog\//);
});

const USER_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ROLE_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FBW';
const LOCATION_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FCX';
const UNIT_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FDY';
const CHURCH_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FEZ';

type FetchCall = {
  url: string;
  method: string;
  body: string | null;
};

const originalFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];

before(() => {
  process.env.FHC_LARAVEL_API_URL = 'http://example.test/api/v1';
  process.env.NEXT_PUBLIC_FHC_API_URL = 'http://example.test/api/v1';
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  fetchCalls = [];
});

function jsonResponse(data: unknown, status = 201): Response {
  return new Response(JSON.stringify({ data, meta: {}, correlation_id: 'corr-test' }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function installFetch(handler: (call: FetchCall) => Response): FetchCall[] {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call: FetchCall = {
      url,
      method: String(init?.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? init.body : init?.body == null ? null : String(init.body),
    };
    fetchCalls.push(call);
    return handler(call);
  }) as typeof fetch;
  return fetchCalls;
}

test('executeAdminAction maps create church onto POST /admin/church/churches', async () => {
  installFetch((call) => {
    assert.match(call.url, /\/admin\/church\/churches$/);
    assert.equal(call.method, 'POST');
    const payload = JSON.parse(call.body ?? '{}') as Record<string, string>;
    assert.equal(payload.name, 'Family House Accra');
    assert.equal(payload.location_id, LOCATION_ULID);
    assert.equal(payload.administrative_unit_id, UNIT_ULID);
    return jsonResponse({ id: CHURCH_ULID, name: 'Family House Accra' });
  });

  const result = await executeAdminAction({
    route: '/admin/churches',
    label: 'Create church',
    payload: {
      name: 'Family House Accra',
      location_id: LOCATION_ULID,
      administrative_unit_id: UNIT_ULID,
    },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(result.id, CHURCH_ULID);
  assert.equal((result.data as { name?: string }).name, 'Family House Accra');
});

test('executeAdminAction maps identity assign onto POST /admin/users/{id}/role-assignments', async () => {
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/admin/users/${USER_ULID}/role-assignments$`));
    assert.equal(call.method, 'POST');
    const payload = JSON.parse(call.body ?? '{}') as Record<string, string | null>;
    assert.equal(payload.role_id, ROLE_ULID);
    return jsonResponse({
      id: '01ARZ3NDEKTSV4RRFFQ69G5FGA',
      user_id: USER_ULID,
      role_id: ROLE_ULID,
    });
  });

  const result = await executeAdminAction({
    route: '/admin/users',
    label: 'Assign role',
    recordId: USER_ULID,
    payload: { role_id: ROLE_ULID },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal((result.data as { user_id?: string }).user_id, USER_ULID);
  assert.equal((result.data as { role_id?: string }).role_id, ROLE_ULID);
});

test('executeAdminAction maps KCA application Edit onto POST /admin/kca/applications/{id}/transitions', async () => {
  const applicationId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/admin/kca/applications/${applicationId}/transitions$`));
    assert.equal(call.method, 'POST');
    const payload = JSON.parse(call.body ?? '{}') as Record<string, string | null>;
    assert.equal(payload.status, 'accepted');
    return jsonResponse({ id: applicationId, status: 'accepted' });
  });

  const result = await executeAdminAction({
    route: '/admin/kca/applications',
    label: `Edit Samuel ${applicationId}`,
    recordId: applicationId,
    payload: { status: 'accepted', person_name: 'Samuel' },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal((result.data as { status?: string }).status, 'accepted');
});

test('executeAdminAction maps home church Edit onto PUT /admin/church/home-churches/{id}', async () => {
  const homeChurchId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/admin/church/home-churches/${homeChurchId}$`));
    assert.equal(call.method, 'PUT');
    const payload = JSON.parse(call.body ?? '{}') as Record<string, string>;
    assert.equal(payload.name, 'Family House Home Church - Allen');
    assert.equal(payload.leader_person_id, USER_ULID);
    return jsonResponse({ id: homeChurchId, name: payload.name, status: 'active' });
  });

  const result = await executeAdminAction({
    route: `/admin/home-churches/${homeChurchId}`,
    label: `Edit Family House Home Church - Allen ${homeChurchId}`,
    recordId: homeChurchId,
    payload: {
      name: 'Family House Home Church - Allen',
      leader_person_id: USER_ULID,
      status: 'active',
    },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal((result.data as { name?: string }).name, 'Family House Home Church - Allen');
});

test('executeAdminAction maps Admit on the KCA decision page onto transitions', async () => {
  const applicationId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/admin/kca/applications/${applicationId}/transitions$`));
    assert.equal(call.method, 'POST');
    const payload = JSON.parse(call.body ?? '{}') as Record<string, string | null>;
    assert.equal(payload.status, 'accepted');
    return jsonResponse({ id: applicationId, status: 'accepted' });
  });

  const result = await executeAdminAction({
    route: `/admin/kca/applications/${applicationId}/decision`,
    label: 'Admit',
    recordId: applicationId,
    payload: { status: 'accepted', reason_code: 'accepted_by_admin' },
  });

  assert.equal(fetchCalls.length, 1);
  assert.equal(result.status, 'accepted');
});

test('executeAdminAction maps Request Information and Interview labels onto transitions', async () => {
  const applicationId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
  const expected: Record<string, string> = {
    'Request Information': 'information_required',
    Interview: 'interview',
  };

  for (const [label, status] of Object.entries(expected)) {
    installFetch((call) => {
      assert.match(call.url, new RegExp(`/admin/kca/applications/${applicationId}/transitions$`));
      const payload = JSON.parse(call.body ?? '{}') as Record<string, string | null>;
      assert.equal(payload.status, status);
      return jsonResponse({ id: applicationId, status });
    });

    await executeAdminAction({
      route: `/admin/kca/applications/${applicationId}/decision`,
      label,
      recordId: applicationId,
      payload: { status, reason_code: `${status}_by_admin` },
    });
  }
});

test('executeAdminAction refuses unmapped actions instead of faking success', async () => {
  installFetch(() => {
    throw new Error('unmapped actions must not call the API');
  });

  await assert.rejects(
    () =>
      executeAdminAction({
        route: '/admin/unknown-gadget',
        label: 'Do mystery thing',
        payload: { name: 'should not save' },
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnregisteredAdminActionError);
      assert.equal(error.message, UNREGISTERED_ADMIN_ACTION_MESSAGE);
      return true;
    },
  );
  assert.equal(fetchCalls.length, 0);
});
