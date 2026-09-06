import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  const publishNow = fields.find((field) => field.name === 'publish_now');
  assert.equal(passage?.required, true);
  assert.deepEqual(passage?.visibleWhen, { field: 'publication_type', values: ['bible_study'] });
  assert.equal(isAdminFieldVisible(passage!, { publication_type: 'book' }), false);
  assert.equal(isAdminFieldVisible(passage!, { publication_type: 'bible_study' }), true);
  assert.equal(isAdminFieldVisible(publishNow!, { publication_type: 'book' }), false);
  assert.equal(isAdminFieldVisible(publishNow!, { publication_type: 'sermon' }), true);
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
    /Enter the scripture passage this study manual covers/,
  );
  assert.equal(fetchCalls.length, 0);
});

test('edit publication sends publish_now and keeps the selected type', async () => {
  installFetch();
  await executeAdminAction({
    route: '/admin/press/publications/01ARZ3NDEKTSV4RRFFQ69G5FAV',
    label: 'Edit publication',
    recordId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    payload: {
      title: '2026 Studying at His Feet Manual',
      publisher_name: 'Kingdom Press',
      language_code: 'en',
      format: 'pdf',
      publication_type: 'bible_study',
      passage: 'Luke 10:38-42',
      publish_now: 'true',
    },
  });
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0]?.method, 'PUT');
  const body = JSON.parse(fetchCalls[0]?.body ?? '{}') as {
    publish_now?: boolean;
    publication_type?: string;
    type_metadata?: { passage?: string };
  };
  assert.equal(body.publish_now, true);
  assert.equal(body.publication_type, 'bible_study');
  assert.equal(body.type_metadata?.passage, 'Luke 10:38-42');
});

test('create publication can request publish now', async () => {
  installFetch();
  await executeAdminAction({
    route: '/admin/press/publications/create',
    label: 'Create Publication',
    payload: {
      title: 'Hope Sunday',
      publisher_name: 'Kingdom Press',
      language_code: 'en',
      format: 'pdf',
      publication_type: 'document_pdf',
      publish_now: 'true',
    },
  });
  assert.equal(fetchCalls.length, 1);
  const createBody = JSON.parse(fetchCalls[0]?.body ?? '{}') as { publish_now?: boolean };
  assert.equal(createBody.publish_now, true);
});

test('publish action sends published status', async () => {
  installFetch();
  await executeAdminAction({
    route: '/admin/press/publications/01ARZ3NDEKTSV4RRFFQ69G5FAV',
    label: 'Publish',
    payload: { status: 'published', reason_code: 'publication_reviewed' },
    recordId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
  });
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0]?.url ?? '', /\/publications\/01ARZ3NDEKTSV4RRFFQ69G5FAV\/transitions/);
  const body = JSON.parse(fetchCalls[0]?.body ?? '{}') as { status?: string };
  assert.equal(body.status, 'published');
});

test('press create form shows field errors and books cannot publish without an ISBN', async () => {
  const source = await readFile(new URL('../components/press-ui.tsx', import.meta.url), 'utf8');
  assert.match(source, /fieldErrors=\{fieldErrors\}/);
  assert.match(source, /apiFieldErrors/);
  assert.match(source, /bookNeedsIsbn/);
  assert.match(source, /This book needs an ISBN before it can be published/);
});

test('publications table only shows a published date when published_at is set', async () => {
  const source = await readFile(new URL('../lib/admin-catalog-api.ts', import.meta.url), 'utf8');
  assert.match(source, /key === 'published' \|\| key.startsWith\('published '/);
  assert.match(source, /item.published_at/);
});