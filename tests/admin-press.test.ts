import assert from 'node:assert/strict';
import { afterEach, before, test } from 'node:test';
import { executeAdminAction } from '../lib/admin-mutation-dispatcher.ts';
import { fieldsForEntity, isAdminFieldVisible } from '../lib/admin-form-schemas.ts';

process.env.FHC_LARAVEL_API_URL ??= 'http://example.test/api/v1';
process.env.NEXT_PUBLIC_FHC_API_URL ??= 'http://example.test/api/v1';

const originalFetch = globalThis.fetch;
let fetchCalls: Array<{ url: string; method: string; body: string | null }> = [];

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

function installFetch(): void {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    fetchCalls.push({
      url,
      method: String(init?.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? init.body : init?.body == null ? null : String(init.body),
    });
    return jsonResponse({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV', title: 'Romans Study' });
  }) as typeof fetch;
}

test('study manual passage is required only for bible_study', () => {
  const fields = fieldsForEntity('press_publication');
  const passage = fields.find((field) => field.name === 'passage');
  assert.equal(passage?.required, true);
  assert.deepEqual(passage?.visibleWhen, { field: 'publication_type', values: ['bible_study'] });
  assert.equal(isAdminFieldVisible(passage!, { publication_type: 'book' }), false);
  assert.equal(isAdminFieldVisible(passage!, { publication_type: 'bible_study' }), true);
});

test('create bible_study publication maps passage into type_metadata', async () => {
  installFetch();
  await executeAdminAction({
    route: '/admin/press/publications/create',
    label: 'Create Publication',
    payload: {
      title: 'Romans Study',
      publisher_name: 'Kingdom Press',
      language_code: 'en',
      format: 'pdf',
      publication_type: 'bible_study',
      passage: 'Romans 8',
    },
  });
  assert.equal(fetchCalls.length, 1);
  const body = JSON.parse(fetchCalls[0]?.body ?? '{}') as { type_metadata?: { passage?: string } };
  assert.equal(body.type_metadata?.passage, 'Romans 8');
});

test('create bible_study publication maps scripture alias into passage', async () => {
  installFetch();
  await executeAdminAction({
    route: '/admin/press/publications/create',
    label: 'Create Publication',
    payload: {
      title: 'John Study',
      publisher_name: 'Kingdom Press',
      language_code: 'en',
      format: 'pdf',
      publication_type: 'bible_study',
      scripture: 'John 3:16',
    },
  });
  assert.equal(fetchCalls.length, 1);
  const body = JSON.parse(fetchCalls[0]?.body ?? '{}') as { type_metadata?: { passage?: string } };
  assert.equal(body.type_metadata?.passage, 'John 3:16');
});

test('create bible_study publication without a passage is rejected before the API call', async () => {
  installFetch();
  await assert.rejects(
    () => executeAdminAction({
      route: '/admin/press/publications/create',
      label: 'Create Publication',
      payload: {
        title: 'Untitled Study',
        publisher_name: 'Kingdom Press',
        language_code: 'en',
        format: 'pdf',
        publication_type: 'bible_study',
      },
    }),
    /Study manuals require a scripture passage/,
  );
  assert.equal(fetchCalls.length, 0);
});
